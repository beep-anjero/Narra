"""Service-specific configuration, independent of the web application's environment."""

from pathlib import Path

from pydantic import AnyHttpUrl, Field, SecretStr, TypeAdapter, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="forbid",
        frozen=True,
    )

    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://127.0.0.1:3000", "http://localhost:3000"]
    )
    analytics_api_key: SecretStr | None = None
    max_upload_size_bytes: int = Field(default=20971520, ge=1, le=104857600)
    max_dataset_rows: int = Field(default=100000, ge=1, le=1000000)

    @field_validator("analytics_api_key")
    @classmethod
    def validate_key(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None and len(value.get_secret_value()) < 32:
            raise ValueError("ANALYTICS_API_KEY must be at least 32 characters")
        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_origins(cls, origins: list[str]) -> list[str]:
        # CORS matches origins exactly; paths, credentials, wildcards and query strings
        # are not origins. An empty list deliberately disables cross-origin access.
        validated = []
        for origin in origins:
            url = TypeAdapter(AnyHttpUrl).validate_python(origin)
            if (
                url.username is not None
                or url.password is not None
                or url.path not in (None, "/")
                or url.query is not None
                or url.fragment is not None
                or "*" in origin
            ):
                raise ValueError(
                    "CORS_ORIGINS must contain HTTP(S) origins without paths or credentials"
                )
            normalized = str(url).rstrip("/")
            if normalized not in validated:
                validated.append(normalized)
        return validated
