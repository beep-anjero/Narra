from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.statistics import DatasetStatistics
from app.schemas.visualization import VisualizationRecommendation


class DatasetPreview(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    filename: str
    file_size: int = Field(ge=1)
    row_count: int = Field(ge=1)
    column_count: int = Field(ge=1)
    columns: list[str]
    rows: list[list[str]]
    preview_limit: int = 100
    truncated: bool


class ColumnMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    name: str
    detected_type: Literal["numeric", "categorical", "datetime", "boolean", "text"]
    missing_count: int = Field(ge=0)
    missing_percentage: float = Field(ge=0, le=100)
    unique_count: int = Field(ge=0)
    sample_values: list[str] = Field(max_length=5)


class DatasetAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    preview: DatasetPreview
    column_metadata: list[ColumnMetadata]
    statistics: DatasetStatistics
    recommendations: list[VisualizationRecommendation] = Field(max_length=6)
