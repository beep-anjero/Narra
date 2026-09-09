from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class StatisticsModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class ColumnStatistics(StatisticsModel):
    name: str
    count: int = Field(ge=0)
    missing: int = Field(ge=0)
    missing_percentage: float = Field(ge=0, le=100)
    unique_count: int = Field(ge=0)


class NumericStatistics(ColumnStatistics):
    detected_type: Literal["numeric"] = "numeric"
    invalid_count: int = Field(ge=0)
    mean: float | None
    median: float | None
    standard_deviation: float | None
    minimum: float | None
    maximum: float | None
    q1: float | None
    q3: float | None


class CategoryFrequency(StatisticsModel):
    value: str
    count: int = Field(ge=1)


class CategoricalStatistics(ColumnStatistics):
    detected_type: Literal["categorical", "boolean", "text"]
    top_value: str | None
    top_value_count: int = Field(ge=0)
    top_categories: list[CategoryFrequency] = Field(max_length=10)


class DatetimeStatistics(ColumnStatistics):
    detected_type: Literal["datetime"] = "datetime"
    invalid_count: int = Field(ge=0)
    earliest: str | None
    latest: str | None
    range_days: float | None = Field(ge=0)


class DatasetSummary(StatisticsModel):
    row_count: int = Field(ge=0)
    column_count: int = Field(ge=0)
    total_cells: int = Field(ge=0)
    missing_cells: int = Field(ge=0)
    missing_percentage: float = Field(ge=0, le=100)
    complete_rows: int = Field(ge=0)
    numeric_columns: int = Field(ge=0)
    categorical_columns: int = Field(ge=0)
    datetime_columns: int = Field(ge=0)
    boolean_columns: int = Field(ge=0)
    text_columns: int = Field(ge=0)


class DatasetStatistics(StatisticsModel):
    summary: DatasetSummary
    columns: list[
        Annotated[
            NumericStatistics | CategoricalStatistics | DatetimeStatistics,
            Field(discriminator="detected_type"),
        ]
    ]
