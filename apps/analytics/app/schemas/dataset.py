from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.chart import ChartData
from app.schemas.filters import FilterContext
from app.schemas.insight import Insight
from app.schemas.statistics import DatasetStatistics
from app.schemas.visualization import VisualizationRecommendation


class StoredDatasetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    signed_url: str = Field(min_length=20, max_length=4096)
    filename: str = Field(min_length=1, max_length=255)
    file_size: int = Field(ge=1, le=104857600)
    delimiter: Literal["auto", "comma", "semicolon", "tab"] = "auto"
    header_row: int | None = Field(default=None, ge=1, le=100)
    headerless: bool | None = None


class DatasetPreview(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    filename: str
    file_size: int = Field(ge=1)
    row_count: int = Field(ge=0)
    column_count: int = Field(ge=1)
    columns: list[str]
    rows: list[list[str]]
    preview_limit: int = 100
    truncated: bool
    delimiter: Literal[",", ";", "tab"] = ","
    encoding: Literal["UTF-8", "Windows-1252"] = "UTF-8"
    header_row: int = Field(default=1, ge=1)
    generated_headers: bool = False
    skipped_rows: int = Field(default=0, ge=0)
    warnings: list[str] = Field(default_factory=list, max_length=8)


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
    charts: list[ChartData] = Field(max_length=6)
    insights: list[Insight] = Field(max_length=12)
    filter_context: FilterContext | None = None
