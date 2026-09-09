"""Shared conversion rules keep inference and statistics consistent."""

import numpy as np
import pandas as pd

NUMERIC_PATTERN = r"[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?"
# Full calendar dates only; ambiguous slash dates use pandas' month-first preference.
DATE_PATTERN = r"(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}/\d{1,2}/\d{4})(?:[ T].+)?"


def non_missing(series: pd.Series) -> pd.Series:
    values = series.fillna("").astype(str)
    return values[values.str.strip() != ""]


def numeric_values(values: pd.Series) -> pd.Series:
    cleaned = values.str.strip()
    candidates = cleaned.where(cleaned.str.fullmatch(NUMERIC_PATTERN))
    parsed = pd.to_numeric(candidates.str.replace(",", "", regex=False), errors="coerce")
    return parsed.where(np.isfinite(parsed).fillna(False))


def datetime_values(values: pd.Series) -> pd.Series:
    cleaned = values.str.strip()
    candidates = cleaned.where(cleaned.str.fullmatch(DATE_PATTERN))
    return pd.to_datetime(candidates, errors="coerce", format="mixed", utc=True)
