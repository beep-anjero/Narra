from datetime import date

import pandas as pd

from app.schemas.dataset import DatasetAnalysis
from app.schemas.filters import FilterField, FilterRequest
from app.services.analysis_cache import CachedAnalysis
from app.services.chart_data import prepare_chart_data
from app.services.column_values import datetime_values, non_missing, numeric_values
from app.services.errors import DatasetError
from app.services.insight_generator import generate_insights
from app.services.schema_detector import infer_schema
from app.services.statistics import calculate_statistics
from app.settings import Settings


def filter_fields(frame: pd.DataFrame, analysis: DatasetAnalysis) -> list[FilterField]:
    fields: list[FilterField] = []
    for column in analysis.column_metadata:
        if column.detected_type in ("numeric", "datetime"):
            fields.append(FilterField(column=column.name, kind=column.detected_type))
        elif column.detected_type in ("categorical", "boolean") and column.unique_count <= 50:
            fields.append(
                FilterField(
                    column=column.name,
                    kind="categorical",
                    values=sorted(non_missing(frame[column.name]).unique()),
                )
            )
    return fields


def apply_filters(
    entry: CachedAnalysis, request: FilterRequest, settings: Settings
) -> DatasetAnalysis:
    source = entry.parsed.frame
    mask = pd.Series(True, index=source.index)
    allowed = {field.column: field for field in entry.fields}
    seen: set[str] = set()
    for rule in request.filters:
        field = allowed.get(rule.column)
        if field is None or field.kind != rule.kind or rule.column in seen:
            raise DatasetError("invalid_filter", "A filter column or type is invalid.")
        seen.add(rule.column)
        values = non_missing(source[rule.column])
        if rule.kind == "categorical":
            if not set(rule.values) <= set(field.values):
                raise DatasetError("invalid_filter", "Choose category values from the dataset.")
            selected = values.isin(rule.values)
        elif rule.kind == "numeric":
            if rule.minimum is None and rule.maximum is None:
                raise DatasetError("invalid_filter", "Enter at least one numeric bound.")
            if (
                rule.minimum is not None
                and rule.maximum is not None
                and rule.minimum > rule.maximum
            ):
                raise DatasetError("invalid_filter", "The minimum must not exceed the maximum.")
            numbers = numeric_values(values)
            selected = numbers.notna()
            if rule.minimum is not None:
                selected &= numbers >= rule.minimum
            if rule.maximum is not None:
                selected &= numbers <= rule.maximum
        else:
            try:
                start = date.fromisoformat(rule.start) if rule.start else None
                end = date.fromisoformat(rule.end) if rule.end else None
            except ValueError as error:
                raise DatasetError("invalid_filter", "Enter valid calendar dates.") from error
            if (start is None and end is None) or (start and end and start > end):
                raise DatasetError("invalid_filter", "Enter an ordered date range.")
            dates = datetime_values(values)
            selected = dates.notna()
            if start:
                selected &= dates.dt.date >= start
            if end:
                selected &= dates.dt.date <= end
        mask &= selected.reindex(source.index, fill_value=False).fillna(False)
    frame = source.loc[mask].copy()
    metadata = infer_schema(frame, settings)
    for column, original in zip(metadata, entry.analysis.column_metadata, strict=True):
        column.detected_type = original.detected_type
    recommendations = []
    for original in entry.analysis.recommendations:
        x = non_missing(frame[original.x_column])
        if original.chart_type in ("scatter", "histogram"):
            x = numeric_values(x).dropna()
        elif original.chart_type == "line":
            x = datetime_values(x).dropna()
        valid_rows = len(x)
        if original.y_column:
            y = numeric_values(non_missing(frame[original.y_column])).dropna()
            valid_rows = len(x.index.intersection(y.index))
        recommendations.append(
            original.model_copy(
                update={
                    "valid_rows": valid_rows,
                    "reason": (
                        "Chart selected from the original dataset. "
                        "Values reflect filters; confidence is unchanged."
                    ),
                }
            )
        )
    preview = entry.analysis.preview.model_copy(
        update={
            "row_count": len(frame),
            "rows": frame.head(100).values.tolist(),
            "truncated": len(frame) > 100,
        }
    )
    return DatasetAnalysis(
        preview=preview,
        column_metadata=metadata,
        statistics=calculate_statistics(frame, metadata),
        recommendations=recommendations,
        charts=prepare_chart_data(frame, recommendations),
        insights=generate_insights(frame, metadata),
    )
