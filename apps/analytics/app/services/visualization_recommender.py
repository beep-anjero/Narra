"""Bounded, deterministic compatibility ranking, not statistical significance."""

import re
from collections import Counter
from itertools import combinations
from typing import Literal

import pandas as pd

from app.schemas.dataset import ColumnMetadata
from app.schemas.visualization import VisualizationRecommendation as Recommendation
from app.services.column_values import datetime_values, non_missing, numeric_values

IDENTIFIER = re.compile(r"(?:^|[_\s-])(id|identifier|zip|postcode|code)(?:$|[_\s-])", re.I)
ADDITIVE = re.compile(
    r"(?:^|[_\s-])(revenue|sales|profit|cost|spend|quantity|units|orders|total)(?:$|[_\s-])", re.I
)
NON_ADDITIVE = re.compile(
    r"(?:^|[_\s-])(rate|ratio|percent|percentage|average|avg|score|age|temperature)(?:$|[_\s-])",
    re.I,
)


def _aggregation(name: str) -> Literal["sum", "mean"]:
    return "sum" if ADDITIVE.search(name) and not NON_ADDITIVE.search(name) else "mean"


def recommend_visualizations(
    frame: pd.DataFrame, metadata: list[ColumnMetadata]
) -> list[Recommendation]:
    if [column.name for column in metadata] != list(frame.columns):
        raise ValueError("Schema columns must match the dataset in order.")
    if len(frame) < 2:
        return []
    values: dict[str, pd.Series] = {}
    kinds: dict[str, list[str]] = {"numeric": [], "datetime": [], "categorical": []}
    for column in metadata:
        raw = non_missing(frame[column.name])
        if IDENTIFIER.search(column.name) and column.unique_count / max(len(raw), 1) >= 0.9:
            continue
        if column.detected_type == "numeric":
            parsed = numeric_values(raw).dropna()
            kind = "numeric"
        elif column.detected_type == "datetime":
            parsed = datetime_values(raw).dropna()
            kind = "datetime"
        elif column.detected_type in ("categorical", "boolean"):
            parsed = raw
            kind = "categorical"
        else:
            continue
        if len(parsed) < 2 or parsed.nunique() < 2:
            continue
        values[column.name] = parsed
        kinds[kind].append(column.name)
    # Bound pairwise work for wide CSVs. Prefer usable rows, then recognizable
    # additive measures, then source order (Python's stable sort).
    for kind, names in kinds.items():
        names.sort(key=lambda name: (-len(values[name]), -int(bool(ADDITIVE.search(name)))))
        kinds[kind] = names[: 4 if kind == "datetime" else 8]
    candidates: list[Recommendation] = []

    def add(chart_type, x, y, aggregation, base, reason, semantic=False):
        paired = pd.concat([values[x], values[y]], axis=1).dropna() if y else values[x].to_frame()
        count = len(paired)
        if count < 2 or any(
            paired.iloc[:, index].nunique() < 2 for index in range(paired.shape[1])
        ):
            return
        score = min(
            1.0, base + 0.2 * count / len(frame) + 0.1 * min(count / 30, 1) + 0.05 * semantic
        )
        title = (
            f"{aggregation.title()} {y} by {x}"
            if y and chart_type != "scatter"
            else f"{y} vs {x}"
            if y
            else f"Distribution of {x}"
            if chart_type == "histogram"
            else f"Records by {x}"
        )
        candidates.append(
            Recommendation(
                chart_type=chart_type,
                title=title,
                x_column=x,
                y_column=y,
                aggregation=aggregation,
                reason=(
                    f"{reason} Uses {count:,} valid rows; confidence describes chart "
                    "suitability, not statistical significance."
                ),
                score=round(score, 4),
                valid_rows=count,
            )
        )

    for date in kinds["datetime"]:
        add(
            "line",
            date,
            None,
            "count",
            0.58,
            "A datetime column supports record frequency over time.",
        )
        for numeric in kinds["numeric"]:
            aggregation = _aggregation(numeric)
            add(
                "line",
                date,
                numeric,
                aggregation,
                0.65,
                f"Datetime and numeric columns support a time series ({aggregation} aggregation).",
                aggregation == "sum",
            )
    for category in kinds["categorical"]:
        cardinality = int(values[category].nunique())
        if cardinality > 30:
            continue  # Avoid unreadable category axes in the first dashboard.
        add(
            "donut" if cardinality <= 8 else "bar",
            category,
            None,
            "count",
            0.54 if cardinality <= 8 else 0.5,
            f"{cardinality} categories support a readable frequency comparison.",
        )
        for numeric in kinds["numeric"]:
            aggregation = _aggregation(numeric)
            add(
                "bar",
                category,
                numeric,
                aggregation,
                0.6,
                f"{cardinality} categories support grouped {aggregation} values.",
                aggregation == "sum",
            )
    for numeric in kinds["numeric"]:
        add(
            "histogram",
            numeric,
            None,
            "count",
            0.5,
            "A varying numeric column supports a distribution histogram.",
        )
    for x, y in combinations(kinds["numeric"], 2):
        add(
            "scatter",
            x,
            y,
            "none",
            0.55,
            "Two numeric columns support a relationship plot without implying causation.",
        )

    candidates.sort(key=lambda item: -item.score)
    selected: list[Recommendation] = []
    counts: Counter[str] = Counter()
    for item in candidates:
        if counts[item.chart_type] >= 2:
            continue
        selected.append(item)
        counts[item.chart_type] += 1
        if len(selected) == 6:
            break
    return selected
