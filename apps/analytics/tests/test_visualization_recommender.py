import pandas as pd
import pytest

from app.services.schema_detector import infer_schema
from app.services.visualization_recommender import recommend_visualizations
from app.settings import Settings


def recommend(data, **settings):
    frame = pd.DataFrame(data)
    schema = infer_schema(frame, Settings(_env_file=None, **settings))
    return recommend_visualizations(frame, schema)


def test_time_series_and_record_frequency():
    results = recommend(
        {"Date": ["2026-01-01", "2026-02-01"] * 10, "Revenue": list(map(str, range(20)))}
    )
    lines = [item for item in results if item.chart_type == "line"]
    assert {(item.y_column, item.aggregation) for item in lines} == {
        ("Revenue", "sum"),
        (None, "count"),
    }
    assert all(item.x_column == "Date" for item in lines)


@pytest.mark.parametrize("count, chart", [(8, "donut"), (9, "bar"), (30, "bar")])
def test_category_frequency_rules(count, chart):
    results = recommend({"Category": [f"C{i}" for i in range(count)] * 2})
    assert len(results) == 1
    assert results[0].chart_type == chart
    assert results[0].aggregation == "count"


def test_high_cardinality_categories_do_not_produce_unreadable_charts():
    assert recommend({"Category": [f"C{i}" for i in range(31)] * 2}) == []


def test_grouped_measures_default_to_mean_and_respect_non_additive_names():
    results = recommend(
        {"Region": ["East", "West"] * 10, "Revenue rate": list(map(str, range(20)))}
    )
    bar = next(item for item in results if item.chart_type == "bar")
    assert bar.aggregation == "mean"
    assert bar.x_column == "Region"


def test_numeric_pair_and_single_numeric_rules():
    results = recommend({"Height": ["10", "20", "30"], "Weight": ["1", "4", "9"]})
    assert {item.chart_type for item in results} == {"scatter", "histogram"}
    assert len([item for item in results if item.chart_type == "scatter"]) == 1
    assert recommend({"Value": ["1", "2"]})[0].chart_type == "histogram"


def test_pairwise_validity_uses_overlapping_rows_not_column_counts():
    results = recommend({"A": ["1", "2", "", ""], "B": ["", "", "3", "4"]})
    assert all(item.chart_type != "scatter" for item in results)


@pytest.mark.parametrize(
    "data",
    [
        {"ID": ["1001", "1002"]},
        {"Value": ["2", "2"]},
        {"Empty": ["", " "]},
        {"Text": ["hello", "world"]},
        {"Value": ["1"]},
    ],
)
def test_unsupported_or_uninformative_data_returns_no_recommendations(data):
    assert recommend(data) == []


def test_missing_and_invalid_values_reduce_confidence():
    clean = recommend({"Value": ["1", "2", "3", "4"]})[0]
    sparse = recommend({"Value": ["1", "2", "bad", ""]}, numeric_parse_threshold=0.5)[0]
    assert sparse.valid_rows == 2
    assert sparse.score < clean.score
    assert "not statistical significance" in sparse.reason


def test_ranked_output_is_bounded_diverse_deterministic_and_preserves_source():
    frame = pd.DataFrame({f"Value_{i}": [str(j + i) for j in range(40)] for i in range(15)})
    frame["Date"] = [f"2026-01-{j % 28 + 1:02d}" for j in range(40)]
    frame["Region"] = ["East", "West"] * 20
    before = frame.copy(deep=True)
    schema = infer_schema(frame, Settings(_env_file=None))
    first = recommend_visualizations(frame, schema)
    assert first == recommend_visualizations(frame, schema)
    assert len(first) == 6
    assert [item.score for item in first] == sorted([item.score for item in first], reverse=True)
    assert all(0 <= item.score <= 1 for item in first)
    assert len({item.chart_type for item in first}) >= 3
    pd.testing.assert_frame_equal(frame, before)


def test_rejects_misaligned_schema():
    with pytest.raises(ValueError, match="Schema columns"):
        recommend_visualizations(pd.DataFrame({"A": ["1", "2"]}), [])
