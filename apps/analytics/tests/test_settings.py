import pytest
from pydantic import ValidationError

from app.settings import Settings


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "null",
        "ftp://example.com",
        "https://example.com/path",
        "https://user:pass@example.com",
        "https://example.com?key=value",
        "https://example.com#fragment",
        "https://*.example.com",
    ],
)
def test_invalid_origins_fail_at_startup(origin: str):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, cors_origins=[origin])


def test_origins_are_normalized_and_deduplicated():
    settings = Settings(
        _env_file=None, cors_origins=["https://example.com/", "https://example.com"]
    )
    assert settings.cors_origins == ["https://example.com"]


def test_environment_overrides_dotenv(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text('CORS_ORIGINS=["https://file.example"]', encoding="utf-8")
    monkeypatch.setenv("CORS_ORIGINS", '["https://env.example"]')
    assert Settings(_env_file=env_file).cors_origins == ["https://env.example"]


def test_empty_origins_allow_server_only_operation():
    assert Settings(_env_file=None, cors_origins=[]).cors_origins == []
