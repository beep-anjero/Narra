import math

import pandas as pd


def detect_outliers(values: pd.Series) -> dict[str, int | float | None]:
    """IQR fences on finite parsed values, with scaling to avoid overflow."""
    values = values.dropna().astype(float)
    if len(values) < 4:
        return {"count": 0, "valid_rows": len(values), "lower": None, "upper": None}
    scale = float(values.abs().max()) or 1.0
    scaled = values / scale
    q1, q3 = scaled.quantile([0.25, 0.75])
    lower, upper = q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1)
    return {
        "count": int(((scaled < lower) | (scaled > upper)).sum()),
        "valid_rows": len(values),
        "lower": float(lower) * scale if math.isfinite(float(lower) * scale) else None,
        "upper": float(upper) * scale if math.isfinite(float(upper) * scale) else None,
        "q1": float(q1 * scale),
        "q3": float(q3 * scale),
    }
