import pandas as pd
import pytest
from pydantic import ValidationError

from app.services.schema_detector import infer_schema
from app.settings import Settings


def metadata(frame: pd.DataFrame, **settings):
    return {item.name: item for item in infer_schema(frame, Settings(_env_file=None, **settings))}


def test_detects_each_supported_column_type():
    result = metadata(
        pd.DataFrame(
            {
                "Revenue": ["1,200", "2.5", "3", ""],
                "Category": ["Hardware", "Software", "Hardware", "Software"],
                "Order Date": ["2025-01-01", "2025-02-03", "2025-03-05", "2025-04-07"],
                "Is Active": ["1", "0", "1", "0"],
                "Score": ["1", "0", "1", "0"],
                "Comment": ["First note", "Second note", "Third note", "Fourth note"],
            }
        )
    )
    assert {name: item.detected_type for name, item in result.items()} == {
        "Revenue": "numeric",
        "Category": "categorical",
        "Order Date": "datetime",
        "Is Active": "boolean",
        "Score": "numeric",
        "Comment": "text",
    }


def test_lexical_booleans_and_integer_ids_are_not_dates():
    result = metadata(
        pd.DataFrame(
            {
                "Approved": ["yes", "no", "YES", "No"],
                "Customer ID": ["100001", "100002", "100003", "100004"],
            }
        )
    )
    assert result["Approved"].detected_type == "boolean"
    assert result["Customer ID"].detected_type == "numeric"


def test_metadata_counts_missing_values_unique_values_and_samples():
    result = metadata(
        pd.DataFrame({"Region": ["North", " ", "South", "North", ""]}),
        categorical_unique_ratio_threshold=0.7,
    )
    region = result["Region"]
    assert region.detected_type == "categorical"
    assert region.missing_count == 2
    assert region.missing_percentage == 40
    assert region.unique_count == 2
    assert region.sample_values == ["North", "South"]


def test_parse_thresholds_are_configurable():
    frame = pd.DataFrame({"Value": ["1", "2", "3", "4", "bad", "5", "6", "7", "8", "9"]})
    assert metadata(frame)["Value"].detected_type == "numeric"
    assert metadata(frame, numeric_parse_threshold=0.95)["Value"].detected_type == "text"


def test_datetime_and_categorical_thresholds_are_configurable():
    dates = pd.DataFrame({"When": ["2025-01-01", "2025-01-02", "unknown", "2025-01-04"]})
    assert metadata(dates, datetime_parse_threshold=0.75)["When"].detected_type == "datetime"
    assert metadata(dates, datetime_parse_threshold=1)["When"].detected_type == "text"
    categories = pd.DataFrame({"Value": ["a", "b", "c", "a", "b", "c"]})
    assert metadata(categories)["Value"].detected_type == "categorical"
    assert (
        metadata(categories, categorical_unique_ratio_threshold=0.4)["Value"].detected_type
        == "text"
    )


def test_empty_columns_are_text_with_no_values():
    empty = metadata(pd.DataFrame({"Empty": ["", " ", ""]}))["Empty"]
    assert empty.detected_type == "text"
    assert empty.missing_count == 3
    assert empty.unique_count == 0
    assert empty.sample_values == []


@pytest.mark.parametrize(
    "values",
    [
        ["1,2", "3,4"],
        ["inf", "-inf"],
        ["1e999", "2e999"],
        ["12:30", "13:45"],
        ["January", "February"],
        ["2024-02-30", "2024-13-01"],
    ],
)
def test_ambiguous_dates_and_invalid_numbers_remain_text(values):
    assert metadata(pd.DataFrame({"Value": values}))["Value"].detected_type == "text"


def test_mixed_timezone_dates_are_valid_without_warnings():
    values = ["2025-01-02T12:00:00Z", "2025-01-03T12:00:00+08:00", "2025-01-04"]
    assert metadata(pd.DataFrame({"When": values}))["When"].detected_type == "datetime"


def test_literal_null_labels_are_not_missing_and_source_is_not_mutated():
    frame = pd.DataFrame({"Label": ["NA", "NULL", "NaN", ""]})
    original = frame.copy(deep=True)
    result = metadata(frame)["Label"]
    assert result.missing_count == 1
    assert result.unique_count == 3
    assert result.sample_values == ["NA", "NULL", "NaN"]
    pd.testing.assert_frame_equal(frame, original)


def test_empty_dataframe_returns_safe_metadata():
    result = metadata(pd.DataFrame({"Empty": pd.Series(dtype=str)}))["Empty"]
    assert result.missing_percentage == 0
    assert result.detected_type == "text"


def test_samples_are_stable_bounded_and_configurable():
    frame = pd.DataFrame({"Label": ["b", "a", "b", "c", "d", "e", "f"]})
    assert metadata(frame)["Label"].sample_values == ["b", "a", "c", "d", "e"]
    assert metadata(frame, schema_sample_size=2)["Label"].sample_values == ["b", "a"]
    with pytest.raises(ValidationError):
        Settings(_env_file=None, schema_sample_size=6)


def test_threshold_denominator_excludes_only_missing_values():
    frame = pd.DataFrame({"Value": ["10"] * 9 + ["bad", "", " "]})
    result = metadata(frame)["Value"]
    assert result.detected_type == "numeric"
    assert result.missing_count == 2
    assert result.unique_count == 2
