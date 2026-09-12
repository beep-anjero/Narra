from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class VisualizationRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)

    chart_type: Literal["line", "bar", "scatter", "histogram", "donut"]
    title: str
    x_column: str
    y_column: str | None
    aggregation: Literal["sum", "mean", "count", "none"]
    reason: str
    score: float = Field(ge=0, le=1)
    valid_rows: int = Field(ge=0)


class VisualizationRecommendations(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    recommendations: list[VisualizationRecommendation] = Field(max_length=6)
