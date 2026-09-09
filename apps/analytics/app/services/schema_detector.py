"""Deterministic column classification. Statistics and recommendations stay separate."""

import re
from collections.abc import Iterable
from typing import Literal

import numpy as np
import pandas as pd

from app.schemas.dataset import ColumnMetadata
from app.settings import Settings

LEXICAL_BOOLEAN_VALUES = {"true", "false", "yes", "no", "y", "n", "t", "f"}
NUMERIC_BOOLEAN_VALUES = {"0", "1"}
BOOLEAN_NAME_HINT = re.compile(
    r"(?:^|[_\s-])(is|has|can|was|flag|active|enabled|verified|subscribed|opted)"
    r"(?:[_\s-]|$)|bool",
    re.IGNORECASE,
)
NUMERIC_PATTERN = r"[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?"
# Require a complete calendar date: no year-only IDs, time-only values, or partial
# month/day strings that could acquire the current year. Slash dates are month-first.
DATE_PATTERN = r"(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}/\d{1,2}/\d{4})(?:[ T].+)?"
DetectedType = Literal["numeric", "categorical", "datetime", "boolean", "text"]


def _non_missing(series: pd.Series) -> pd.Series:
    values = series.fillna("").astype(str)
    return values[values.str.strip() != ""]


def _sample_values(values: Iterable[str], size: int) -> list[str]:
    samples: list[str] = []
    seen: set[str] = set()
    for value in values:
        if value not in seen:
            samples.append(value)
            seen.add(value)
        if len(samples) == size:
            break
    return samples


def _is_boolean(name: str, values: pd.Series) -> bool:
    normalized = values.str.strip().str.casefold()
    distinct = set(normalized.unique())
    if distinct and distinct <= LEXICAL_BOOLEAN_VALUES:
        return True
    return bool(distinct and distinct <= NUMERIC_BOOLEAN_VALUES and BOOLEAN_NAME_HINT.search(name))


def _detected_type(name: str, values: pd.Series, settings: Settings) -> DetectedType:
    if values.empty:
        return "text"
    if _is_boolean(name, values):
        return "boolean"
    cleaned = values.str.strip()
    numeric_candidates = cleaned.where(cleaned.str.fullmatch(NUMERIC_PATTERN))
    numeric_values = pd.to_numeric(
        numeric_candidates.str.replace(",", "", regex=False), errors="coerce"
    )
    numeric_ratio = float(np.isfinite(numeric_values).fillna(False).mean())
    # Evaluate ordinary integers as numeric before considering dates, so numeric IDs
    # cannot become timestamps just because pandas can coerce them.
    if numeric_ratio >= settings.numeric_parse_threshold:
        return "numeric"
    date_candidates = cleaned.where(cleaned.str.fullmatch(DATE_PATTERN))
    parsed_dates = pd.to_datetime(date_candidates, errors="coerce", format="mixed", utc=True)
    datetime_ratio = float(parsed_dates.notna().mean())
    if datetime_ratio >= settings.datetime_parse_threshold:
        return "datetime"
    unique_ratio = values.nunique(dropna=True) / len(values)
    if unique_ratio <= settings.categorical_unique_ratio_threshold:
        return "categorical"
    return "text"


def infer_schema(frame: pd.DataFrame, settings: Settings) -> list[ColumnMetadata]:
    """Classify each validated CSV column without calculating statistics or changing data."""
    total_rows = len(frame)
    metadata: list[ColumnMetadata] = []
    for name in frame.columns:
        raw = frame[name]
        values = _non_missing(raw)
        missing_count = total_rows - len(values)
        metadata.append(
            ColumnMetadata(
                name=str(name),
                detected_type=_detected_type(str(name), values, settings),
                missing_count=missing_count,
                missing_percentage=round(missing_count / total_rows * 100, 2)
                if total_rows
                else 0.0,
                unique_count=int(values.nunique(dropna=True)),
                sample_values=_sample_values(values, settings.schema_sample_size),
            )
        )
    return metadata
