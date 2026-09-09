import json
import math

import pandas as pd
import pytest

from app.services.schema_detector import infer_schema
from app.services.statistics import calculate_statistics
from app.settings import Settings


def analyze(data, **settings):
    frame = pd.DataFrame(data)
    metadata = infer_schema(frame, Settings(_env_file=None, **settings))
    return calculate_statistics(frame, metadata)


def test_numeric_statistics_match_known_values():
    result = analyze({"Score": ["1", "2", "3", "4", ""]})
    column = result.columns[0]
    assert column.count == 4
    assert column.missing == 1
    assert column.missing_percentage == 20
    assert column.invalid_count == 0
    assert column.mean == column.median == 2.5
    assert column.standard_deviation == pytest.approx(math.sqrt(5 / 3))
    assert (column.minimum, column.maximum, column.q1, column.q3) == (1, 4, 1.75, 3.25)


def test_missing_and_invalid_values_are_distinct():
    column = analyze(
        {"Score": ["1,000", "2000", "bad", " ", ""]}, numeric_parse_threshold=0.5
    ).columns[0]
    assert (column.count, column.missing, column.invalid_count) == (2, 2, 1)
    assert column.mean == 1500
    assert column.unique_count == 3


@pytest.mark.parametrize("values, expected", [(["9"], None), (["0", "0"], 0)])
def test_single_value_and_constant_columns(values, expected):
    column = analyze({"Score": values}).columns[0]
    assert column.standard_deviation == expected


def test_extreme_finite_values_remain_json_safe():
    result = analyze({"Score": ["-1.7e308", "1.7e308"]})
    column = result.columns[0]
    assert column.mean == column.median == 0
    assert column.standard_deviation is None  # Beyond float64's representable range.
    assert column.minimum == -1.7e308
    json.dumps(result.model_dump(), allow_nan=False)


def test_minimum_int64_does_not_overflow_during_scaling():
    column = analyze({"Score": ["-9223372036854775808", "0"]}).columns[0]
    assert column.mean == pytest.approx(-4611686018427387904)
    assert column.minimum < column.maximum == 0


def test_small_quantiles_survive_a_large_dynamic_range():
    column = analyze({"Score": ["1e-300", "1e-300", "1e-300", "1e300"]}).columns[0]
    assert column.minimum == column.median == column.q1 == 1e-300


def test_category_ties_are_stable_and_preserve_original_strings():
    column = analyze({"Region": ["West", "East", "West", "East", "", " "]}).columns[0]
    assert column.detected_type == "categorical"
    assert (column.count, column.missing, column.unique_count) == (4, 2, 2)
    assert column.top_value == "East"
    assert column.top_value_count == 2
    assert [(item.value, item.count) for item in column.top_categories] == [
        ("East", 2),
        ("West", 2),
    ]


def test_category_frequencies_are_bounded_and_do_not_merge_literal_nulls():
    values = [str(index) + "x" for index in range(20)] + ["NA", "NULL"]
    column = analyze({"Category": values * 2}).columns[0]
    assert column.unique_count == 22
    assert column.missing == 0
    assert len(column.top_categories) == 10
    assert sum(item.count for item in column.top_categories) == 20


def test_datetime_statistics_normalize_offsets_and_exclude_invalid_values():
    column = analyze(
        {"Date": ["2026-09-01T02:00:00+02:00", "2026-09-03", "invalid", ""]},
        datetime_parse_threshold=0.5,
    ).columns[0]
    assert (column.count, column.missing, column.invalid_count) == (2, 1, 1)
    assert column.earliest == "2026-09-01T00:00:00+00:00"
    assert column.latest == "2026-09-03T00:00:00+00:00"
    assert column.range_days == 2


def test_datetime_subsecond_precision_is_preserved():
    column = analyze({"Date": ["2026-09-01T00:00:00.123456789Z"]}).columns[0]
    assert column.earliest == "2026-09-01T00:00:00.123456789+00:00"
    assert column.range_days == 0


def test_all_missing_and_empty_dataset_have_defined_results():
    result = analyze({"Empty": ["", " ", None]})
    column = result.columns[0]
    assert (column.count, column.missing, column.top_value, column.top_value_count) == (
        0,
        3,
        None,
        0,
    )
    assert result.summary.missing_percentage == 100
    assert result.summary.complete_rows == 0
    empty = analyze({"Empty": []})
    assert empty.summary.total_cells == empty.summary.missing_percentage == 0
    assert empty.columns[0].top_categories == []


def test_summary_counts_each_cell_once_and_reports_all_types():
    result = analyze(
        {
            "Score": ["1", "2", "3", ""],
            "Region": ["East", "East", "West", "West"],
            "Date": ["2026-09-01"] * 4,
            "Active": ["yes", "no", "yes", "no"],
            "Note": ["a", "b", "c", " "],
        }
    )
    assert result.summary.model_dump() == {
        "row_count": 4,
        "column_count": 5,
        "total_cells": 20,
        "missing_cells": 2,
        "missing_percentage": 10.0,
        "complete_rows": 3,
        "numeric_columns": 1,
        "categorical_columns": 1,
        "datetime_columns": 1,
        "boolean_columns": 1,
        "text_columns": 1,
    }


def test_statistics_do_not_mutate_input_and_reject_misaligned_schema():
    frame = pd.DataFrame({"Score": [" 001 ", "2", ""]})
    before = frame.copy(deep=True)
    metadata = infer_schema(frame, Settings(_env_file=None))
    calculate_statistics(frame, metadata)
    pd.testing.assert_frame_equal(frame, before)
    with pytest.raises(ValueError, match="Schema columns"):
        calculate_statistics(frame, [])
