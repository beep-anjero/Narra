"""Bounded deterministic insights with calculation evidence; no causal claims."""

import math
from itertools import combinations

import numpy as np
import pandas as pd

from app.schemas.dataset import ColumnMetadata
from app.schemas.insight import Insight
from app.services.column_values import datetime_values, non_missing, numeric_values
from app.services.outlier_detector import detect_outliers


def generate_insights(frame: pd.DataFrame, metadata: list[ColumnMetadata]) -> list[Insight]:
    if [column.name for column in metadata] != list(frame.columns):
        raise ValueError("Schema columns must match the dataset in order.")
    insights: list[Insight] = []
    for column in sorted(metadata, key=lambda item: -item.missing_percentage)[:2]:
        if column.missing_count:
            insights.append(
                Insight(
                    type="missing_data",
                    title=f"Missing values in {column.name}",
                    description=(
                        f"{column.missing_percentage:g}% of {column.name} values are blank. "
                        "Calculations exclude missing values."
                    ),
                    severity="warning",
                    columns=[column.name],
                    metadata={
                        "missing_count": column.missing_count,
                        "row_count": len(frame),
                        "percentage": column.missing_percentage,
                    },
                )
            )
    numeric = {
        column.name: numeric_values(non_missing(frame[column.name])).dropna()
        for column in metadata
        if column.detected_type == "numeric"
    }
    # Bounded pairwise work; source order breaks ties.
    names = sorted(numeric, key=lambda name: -len(numeric[name]))[:8]
    outliers: list[Insight] = []
    for name in names:
        evidence = detect_outliers(numeric[name])
        if evidence["count"]:
            outliers.append(
                Insight(
                    type="outlier",
                    title=f"Potential outliers in {name}",
                    description=(
                        f"{evidence['count']} values fall outside the 1.5 × IQR fences. "
                        "They remain in the dataset and may be valid observations."
                    ),
                    severity="warning",
                    columns=[name],
                    metadata=evidence,
                )
            )
    insights.extend(outliers[:2])
    correlations: list[tuple[float, Insight]] = []
    for x, y in combinations(names, 2):
        paired = pd.concat([numeric[x].rename("x"), numeric[y].rename("y")], axis=1).dropna()
        if len(paired) < 3 or paired.nunique().min() < 2:
            continue
        scaled = paired / paired.abs().max()
        with np.errstate(divide="ignore", invalid="ignore", under="ignore"):
            coefficient = float(scaled["x"].corr(scaled["y"]))
        if not math.isfinite(coefficient) or abs(coefficient) < 0.4:
            continue
        strength = "strong" if abs(coefficient) >= 0.7 else "moderate"
        direction = "positive" if coefficient > 0 else "negative"
        correlations.append(
            (
                abs(coefficient),
                Insight(
                    type="correlation",
                    title=f"{x} and {y} move together",
                    description=(
                        f"{x} and {y} show a {strength} {direction} Pearson correlation "
                        f"(r = {coefficient:.3f}). Correlation does not establish causation."
                    ),
                    columns=[x, y],
                    metadata={
                        "pearson_r": coefficient,
                        "valid_pairs": len(paired),
                        "strength": strength,
                    },
                ),
            )
        )
    insights.extend(item for _, item in sorted(correlations, key=lambda item: -item[0])[:2])
    categories = [
        column
        for column in metadata
        if column.detected_type in ("categorical", "boolean") and 2 <= column.unique_count <= 30
    ]
    for column in categories[:2]:
        frequencies = non_missing(frame[column.name]).value_counts()
        ranked = sorted(frequencies.items(), key=lambda item: (-item[1], item[0]))
        if not ranked:
            continue
        value, count = ranked[0]
        insights.append(
            Insight(
                type="top_category",
                title=f"Most frequent {column.name}",
                description=(
                    f"{value} appears in {count} of {int(frequencies.sum())} records. "
                    "Missing values are excluded. Frequency ties are resolved by label."
                ),
                columns=[column.name],
                metadata={
                    "category": str(value),
                    "count": int(count),
                    "valid_rows": int(frequencies.sum()),
                },
            )
        )
    dates = [column.name for column in metadata if column.detected_type == "datetime"][:1]
    for date in dates:
        parsed = datetime_values(non_missing(frame[date])).dropna()
        for name in names[:2]:
            paired = pd.concat(
                [parsed.rename("date"), numeric[name].rename("value")], axis=1
            ).dropna()
            if paired.empty:
                continue
            values = paired["value"].astype(float)
            scale = float(values.abs().max()) or 1.0
            monthly = (
                (values / scale).groupby(paired["date"].dt.strftime("%Y-%m")).mean().sort_index()
            )
            if len(monthly) < 2:
                continue
            previous, current = monthly.index[-2:]
            before = float(monthly.iloc[-2]) * scale
            after = float(monthly.iloc[-1]) * scale

            # Compare consecutive observed months only, with a nonzero baseline.
            def ordinal(period: str) -> int:
                return int(period[:4]) * 12 + int(period[5:])

            if ordinal(current) - ordinal(previous) != 1 or before == 0 or after == before:
                continue
            percent = (
                (float(monthly.iloc[-1]) - float(monthly.iloc[-2]))
                / abs(float(monthly.iloc[-2]))
                * 100
            )
            if not math.isfinite(percent):
                continue
            insights.append(
                Insight(
                    type="trend",
                    title=f"Monthly change in {name}",
                    description=(
                        f"Average {name} changed {percent:+.1f}% "
                        f"from {previous} to {current}. "
                        "This compares observed records, not a forecast."
                    ),
                    columns=[date, name],
                    metadata={
                        "aggregation": "mean",
                        "previous_period": previous,
                        "current_period": current,
                        "previous_value": before,
                        "current_value": after,
                        "percentage_change": percent,
                        "valid_rows": len(paired),
                    },
                )
            )
    return insights[:12]
