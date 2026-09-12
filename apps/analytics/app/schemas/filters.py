from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class FilterField(BaseModel):
    column: str
    kind: Literal["categorical", "numeric", "datetime"]
    values: list[str] = Field(default_factory=list, max_length=50)


class FilterContext(BaseModel):
    token: str
    expires_in_seconds: int = 900
    fields: list[FilterField] = Field(max_length=200)


class BaseFilter(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)
    column: str = Field(max_length=200)


class CategoryFilter(BaseFilter):
    kind: Literal["categorical"]
    values: list[str] = Field(min_length=1, max_length=50)


class NumericFilter(BaseFilter):
    kind: Literal["numeric"]
    minimum: float | None = None
    maximum: float | None = None


class DateFilter(BaseFilter):
    kind: Literal["datetime"]
    start: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    end: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class FilterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    token: str = Field(min_length=40, max_length=64)
    filters: list[
        Annotated[CategoryFilter | NumericFilter | DateFilter, Field(discriminator="kind")]
    ] = Field(max_length=20)
