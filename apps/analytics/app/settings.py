"""Service-specific configuration, independent of the web application's environment."""

from pathlib import Path

from pydantic import AnyHttpUrl, Field, TypeAdapter, field_validator
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
