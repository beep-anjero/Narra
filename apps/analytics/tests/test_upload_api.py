import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings

KEY = "test-only-key-with-at-least-32-characters"
HEADERS = {"Authorization": f"Bearer {KEY}", "X-Filename": "data.csv", "Content-Type": "text/csv"}


@pytest.fixture
def upload_client():
    with TestClient(
        create_app(Settings(_env_file=None, analytics_api_key=KEY, max_upload_size_bytes=100))
    ) as client:
        yield client


def test_upload_and_preview(upload_client):
    response = upload_client.post("/api/v1/datasets/preview", content=b"A,B\n1,2", headers=HEADERS)
    assert response.status_code == 200
    assert response.json()["rows"] == [["1", "2"]]
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("authorization", ["", "Bearer wrong-key"])
def test_requires_service_auth_before_processing(upload_client, authorization):
    response = upload_client.post(
        "/api/v1/datasets/preview",
        content=b"invalid",
        headers={**HEADERS, "Authorization": authorization},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_missing_service_configuration_fails_closed():
    with TestClient(create_app(Settings(_env_file=None, analytics_api_key=None))) as client:
        response = client.post("/api/v1/datasets/preview", content=b"A\n1", headers=HEADERS)
    assert response.status_code == 503


def test_actual_streamed_size_is_enforced_without_content_length(upload_client):
    response = upload_client.post(
        "/api/v1/datasets/preview", content=iter([b"A\n", b"a" * 101]), headers=HEADERS
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "file_too_large"


def test_duplicate_headers_are_actionable(upload_client):
    response = upload_client.post("/api/v1/datasets/preview", content=b"A,A\n1,2", headers=HEADERS)
    assert response.status_code == 422
    assert response.json()["error"]["message"] == "This CSV contains duplicate column names."
