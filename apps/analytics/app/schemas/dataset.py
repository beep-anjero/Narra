from pydantic import BaseModel, ConfigDict, Field


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
