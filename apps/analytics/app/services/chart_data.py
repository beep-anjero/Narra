"""Bounded, full-dataset chart preparation, independent of rendering and storage."""

import math

import numpy as np
import pandas as pd

from app.schemas.chart import ChartData, ChartPoint
from app.schemas.visualization import VisualizationRecommendation
from app.services.column_values import datetime_values, non_missing, numeric_values


def _aggregate(values: pd.Series, aggregation: str) -> float:
    if aggregation == "count":
        return float(len(values))
    values = values.astype(float)
    scale = float(values.abs().max()) or 1.0
    scaled = values / scale
    result = float(scaled.sum() if aggregation == "sum" else scaled.mean()) * scale
    if not math.isfinite(result):
        raise OverflowError("Values exceed the supported numeric range for this chart.")
    return result


def _prepare(
    frame: pd.DataFrame, recommendation: VisualizationRecommendation
) -> tuple[list[ChartPoint], str]:
    x = non_missing(frame[recommendation.x_column])
    chart_type = recommendation.chart_type
    if chart_type in ("scatter", "histogram"):
        x = numeric_values(x).dropna()
    elif chart_type == "line":
        x = datetime_values(x).dropna()
    if recommendation.y_column:
        y = numeric_values(non_missing(frame[recommendation.y_column])).dropna()
        paired = pd.concat([x.rename("x"), y.rename("y")], axis=1).dropna()
    else:
        paired = pd.DataFrame({"x": x, "y": 1.0})
    if paired.empty:
        return [], "No valid rows are available for this chart."
    if chart_type == "scatter":
        count = len(paired)
        positions = np.linspace(0, count - 1, min(count, 500), dtype=int)
        selected = paired.iloc[positions]
        return [
            ChartPoint(x=float(a), y=float(b))
            for a, b in selected.itertuples(index=False, name=None)
        ], (
            f"Showing {len(selected):,} of {count:,} valid pairs, evenly spaced in source order."
            if count > 500
            else f"All {count:,} valid pairs."
        )
    if chart_type == "histogram":
        values = paired["x"].astype(float)
        scale = float(values.abs().max()) or 1.0
        if (values / scale).nunique() < 2:
            return [
                ChartPoint(x=f"{values.iloc[0]:.6g}", y=float(len(values)))
            ], "All selected values fall into one representable bin."
        counts, edges = np.histogram(
            values / scale, bins=min(20, max(2, int(math.sqrt(len(values)))))
        )
        data = [
            ChartPoint(x=f"{edges[i] * scale:.6g} – {edges[i + 1] * scale:.6g}", y=float(count))
            for i, count in enumerate(counts)
        ]
        return (
            data,
            "Equal-width bins cover all valid values; the final bin includes its upper bound.",
        )
    note = "All valid rows; original category labels are preserved."
    if chart_type == "line":
        dates = paired["x"]
        for pattern, period in (("%Y-%m-%d", "days"), ("%Y-%m", "months"), ("%Y", "years")):
            unit = period
            labels = dates.dt.strftime(pattern)
            if labels.nunique() <= 120:
                break
        else:
            labels = (dates.dt.year // 100 * 100).astype(str).str.zfill(4) + "s"
            unit = "centuries"
        paired = paired.assign(x=labels)
        note = f"All valid rows grouped into observed UTC {unit}; empty periods are omitted."
    grouped = paired.groupby("x", sort=True)["y"]
    data = [
        ChartPoint(x=str(label), y=_aggregate(values, recommendation.aggregation))
        for label, values in grouped
    ]
    if chart_type == "bar":
        data.sort(key=lambda point: (-point.y, str(point.x)))
    return data, note


def prepare_chart_data(
    frame: pd.DataFrame, recommendations: list[VisualizationRecommendation]
) -> list[ChartData]:
    charts: list[ChartData] = []
    for index, recommendation in enumerate(recommendations):
        try:
            data, note = _prepare(frame, recommendation)
            charts.append(ChartData(recommendation_index=index, data=data, note=note))
        except OverflowError as error:
            charts.append(ChartData(recommendation_index=index, data=[], note="", error=str(error)))
    return charts
