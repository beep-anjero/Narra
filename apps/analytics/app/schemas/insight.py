from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Insight(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)
    type: Literal[
        "missing_data", "outlier", "correlation", "top_category", "bottom_category", "trend"
    ]
    title: str
    description: str
    severity: Literal["info", "warning"] = "info"
    columns: list[str] = Field(min_length=1, max_length=2)
    metadata: dict[str, str | int | float | None]


class DatasetInsights(BaseModel):
    insights: list[Insight] = Field(max_length=12)
