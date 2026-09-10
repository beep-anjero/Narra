import pandas as pd
import pytest

from app.schemas.visualization import VisualizationRecommendation
from app.services.chart_data import prepare_chart_data


def chart(frame, kind, aggregation="count", y=None):
    recommendation = VisualizationRecommendation(
        chart_type=kind,
        title="Test",
        x_column="x",
        y_column=y,
        aggregation=aggregation,
        reason="Test",
        score=0.8,
        valid_rows=max(2, len(frame)),
    )
    return prepare_chart_data(frame, [recommendation])[0]


def test_category_sum_and_mean_use_all_valid_rows():
    frame = pd.DataFrame({"x": ["A"] * 100 + ["B", "B", ""], "y": ["2"] * 100 + ["5", "bad", "90"]})
    summed = chart(frame, "bar", "sum", "y")
    assert [(point.x, point.y) for point in summed.data] == [("A", 200), ("B", 5)]
    mean = chart(frame, "bar", "mean", "y")
    assert [(point.x, point.y) for point in mean.data] == [("B", 5), ("A", 2)]


def test_donut_preserves_labels_and_counts_missing_separately():
    result = chart(pd.DataFrame({"x": ["NA", "NA", " ", "Other"]}), "donut")
    assert [(point.x, point.y) for point in result.data] == [("NA", 2), ("Other", 1)]


def test_line_groups_utc_dates_and_sorts_chronologically():
    frame = pd.DataFrame({"x": ["2026-01-03", "2026-01-01T23:00:00-02:00", "2026-01-02"]})
    result = chart(frame, "line")
    assert [(point.x, point.y) for point in result.data] == [("2026-01-02", 2), ("2026-01-03", 1)]


def test_line_reduces_period_granularity_without_losing_rows():
    frame = pd.DataFrame({"x": pd.date_range("2020-01-01", periods=1000).strftime("%Y-%m-%d")})
    result = chart(frame, "line")
    assert len(result.data) <= 120
    assert sum(point.y for point in result.data) == 1000
    assert "months" in result.note


def test_scatter_is_bounded_deterministic_and_includes_endpoints():
    frame = pd.DataFrame({"x": list(map(str, range(1000))), "y": list(map(str, range(1000)))})
    result = chart(frame, "scatter", "none", "y")
    assert len(result.data) == 500
    assert result.data[0].x == 0 and result.data[-1].x == 999
    assert result == chart(frame, "scatter", "none", "y")
    assert "500 of 1,000" in result.note


@pytest.mark.parametrize("values", [["1", "2", "3", "4"], ["-1e308", "1e308"]])
def test_histogram_accounts_for_every_value_including_upper_bound(values):
    result = chart(pd.DataFrame({"x": values}), "histogram")
    assert sum(point.y for point in result.data) == len(values)
    assert 2 <= len(result.data) <= 20
    assert result.error is None


def test_overflow_becomes_chart_error_without_crashing_analysis():
    result = chart(pd.DataFrame({"x": ["A", "A"], "y": ["1.7e308", "1.7e308"]}), "bar", "sum", "y")
    assert result.data == []
    assert "numeric range" in result.error


def test_chart_preparation_preserves_source_and_empty_data():
    frame = pd.DataFrame({"x": ["1", "2"]})
    before = frame.copy(deep=True)
    chart(frame, "histogram")
    pd.testing.assert_frame_equal(frame, before)
    assert chart(pd.DataFrame({"x": ["", " "]}), "donut").data == []
