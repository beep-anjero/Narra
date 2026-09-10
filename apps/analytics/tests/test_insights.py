import pandas as pd
import pytest

from app.services.insight_generator import generate_insights
from app.services.outlier_detector import detect_outliers
from app.services.schema_detector import infer_schema
from app.settings import Settings


def insights(data):
    frame = pd.DataFrame(data)
    return generate_insights(frame, infer_schema(frame, Settings(_env_file=None)))


def test_iqr_outliers_are_reported_not_removed():
    values = pd.Series([1, 2, 3, 4, 100])
    result = detect_outliers(values)
    assert result["count"] == 1
    assert result["lower"] == pytest.approx(-1)
    assert result["upper"] == pytest.approx(7)
    assert len(values) == 5


def test_correlation_uses_valid_pairs_and_does_not_claim_causation():
    found = insights({"Spend": ["1", "2", "3", "4", ""], "Revenue": ["2", "4", "6", "8", "10"]})
    correlation = next(item for item in found if item.type == "correlation")
    assert correlation.metadata["pearson_r"] == pytest.approx(1)
    assert correlation.metadata["valid_pairs"] == 4
    assert "does not establish causation" in correlation.description
    assert any(item.type == "missing_data" for item in found)


def test_constants_and_small_samples_do_not_generate_correlations():
    assert not any(
        item.type == "correlation"
        for item in insights({"A": ["1", "1", "1"], "B": ["2", "3", "4"]})
    )


def test_monthly_change_is_traceable_and_skips_zero_baseline():
    found = insights(
        {
            "Date": ["2026-01-01", "2026-01-02", "2026-02-01", "2026-02-02"],
            "Revenue": ["10", "10", "15", "15"],
        }
    )
    trend = next(item for item in found if item.type == "trend")
    assert trend.metadata["percentage_change"] == pytest.approx(50)
    assert trend.metadata["aggregation"] == "mean"
    assert not any(
        item.type == "trend"
        for item in insights({"Date": ["2026-01-01", "2026-02-01"], "Value": ["0", "1"]})
    )


def test_category_ties_are_stable_and_results_are_bounded():
    data = {"Region": ["West", "East"] * 20, "Value": [str(i) for i in range(40)]}
    found = insights(data)
    assert found == insights(data)
    assert len(found) <= 12
    assert (
        next(item for item in found if item.type == "top_category").metadata["category"] == "East"
    )
