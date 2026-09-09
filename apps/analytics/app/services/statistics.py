"""Full-dataset descriptive statistics; never mutate or remove source records."""

import math

import numpy as np
import pandas as pd

from app.schemas.dataset import ColumnMetadata
from app.schemas.statistics import (
    CategoricalStatistics,
    CategoryFrequency,
    DatasetStatistics,
    DatasetSummary,
    DatetimeStatistics,
    NumericStatistics,
)
from app.services.column_values import datetime_values, non_missing, numeric_values


def _finite(value: float) -> float | None:
    return float(value) if math.isfinite(value) else None


def _numeric_metrics(values: pd.Series) -> dict[str, float | None]:
    names = ("mean", "median", "standard_deviation", "minimum", "maximum", "q1", "q3")
    if values.empty:
        return dict.fromkeys(names)
    # Scaling avoids overflow in pandas sums and squared deviations for finite
    # values near float64's limit. Unrepresentable results become JSON null.
    floating = values.astype(float)
    scale = float(floating.abs().max()) or 1.0
    normalized = floating / scale
    ordered = floating.sort_values(ignore_index=True)

    def quantile(fraction: float) -> float | None:
        # Linear interpolation without subtracting opposite float64 extremes.
        # Work on original values so small quantiles do not underflow when scaled.
        position = (len(ordered) - 1) * fraction
        lower = math.floor(position)
        upper = math.ceil(position)
        weight = position - lower
        return _finite(
            float(ordered.iloc[lower]) * (1 - weight) + float(ordered.iloc[upper]) * weight
        )

    with np.errstate(over="ignore", invalid="ignore"):
        return {
            "mean": _finite(float(normalized.mean()) * scale),
            "median": quantile(0.5),
            "standard_deviation": _finite(float(normalized.std(ddof=1)) * scale)
            if len(values) > 1
            else None,
            "minimum": float(ordered.iloc[0]),
            "maximum": float(ordered.iloc[-1]),
            "q1": quantile(0.25),
            "q3": quantile(0.75),
        }


def calculate_statistics(frame: pd.DataFrame, metadata: list[ColumnMetadata]) -> DatasetStatistics:
    """Count valid parsed values separately from blank cells and parse failures.

    Unique counts describe original non-missing strings, matching schema metadata.
    Frequencies preserve original spelling; ties sort lexicographically.
    """
    if [column.name for column in metadata] != list(frame.columns):
        raise ValueError("Schema columns must match the dataset in order.")
    columns: list[NumericStatistics | CategoricalStatistics | DatetimeStatistics] = []
    missing_mask = (
        frame.fillna("").astype(str).apply(lambda column: column.str.strip().eq("")).astype(bool)
    )
    for column in metadata:
        values = non_missing(frame[column.name])
        common = {
            "name": column.name,
            "missing": len(frame) - len(values),
            "missing_percentage": round((len(frame) - len(values)) / len(frame) * 100, 2)
            if len(frame)
            else 0.0,
            "unique_count": int(values.nunique()),
        }
        if column.detected_type == "numeric":
            parsed = numeric_values(values).dropna()
            columns.append(
                NumericStatistics(
                    **common,
                    count=len(parsed),
                    invalid_count=len(values) - len(parsed),
                    **_numeric_metrics(parsed),
                )
            )
        elif column.detected_type == "datetime":
            parsed = datetime_values(values).dropna()
            earliest = parsed.min() if len(parsed) else None
            latest = parsed.max() if len(parsed) else None
            columns.append(
                DatetimeStatistics(
                    **common,
                    count=len(parsed),
                    invalid_count=len(values) - len(parsed),
                    earliest=earliest.isoformat() if earliest else None,
                    latest=latest.isoformat() if latest else None,
                    range_days=(latest.timestamp() - earliest.timestamp()) / 86400
                    if earliest and latest
                    else None,
                )
            )
        else:
            frequencies = sorted(
                values.value_counts().items(), key=lambda item: (-item[1], item[0])
            )
            top = [
                CategoryFrequency(value=value, count=int(count))
                for value, count in frequencies[:10]
            ]
            columns.append(
                CategoricalStatistics(
                    **common,
                    detected_type=column.detected_type,
                    count=len(values),
                    top_value=top[0].value if top else None,
                    top_value_count=top[0].count if top else 0,
                    top_categories=top,
                )
            )
    missing_cells = int(missing_mask.sum().sum())
    total_cells = int(frame.size)
    type_counts = {
        f"{kind}_columns": sum(column.detected_type == kind for column in metadata)
        for kind in ("numeric", "categorical", "datetime", "boolean", "text")
    }
    return DatasetStatistics(
        summary=DatasetSummary(
            row_count=len(frame),
            column_count=len(frame.columns),
            total_cells=total_cells,
            missing_cells=missing_cells,
            missing_percentage=round(missing_cells / total_cells * 100, 2) if total_cells else 0.0,
            complete_rows=int((~missing_mask.any(axis=1)).sum()),
            **type_counts,
        ),
        columns=columns,
    )
