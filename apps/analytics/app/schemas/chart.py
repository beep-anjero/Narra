from pydantic import BaseModel, ConfigDict, Field


class ChartPoint(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)
    x: str | float
    y: float


class ChartData(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    recommendation_index: int = Field(ge=0, le=5)
    data: list[ChartPoint] = Field(max_length=500)
    note: str
    error: str | None = None
