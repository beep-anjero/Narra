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


def test_upload_and_analyze_returns_schema_from_full_dataset(upload_client):
    response = upload_client.post(
        "/api/v1/datasets/analyze",
        content=b"Revenue,Is Active,Category\n1200,yes,Hardware\n900,no,Software",
        headers=HEADERS,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["preview"]["rows"] == [["1200", "yes", "Hardware"], ["900", "no", "Software"]]
    assert [column["detected_type"] for column in body["column_metadata"]] == [
        "numeric",
        "boolean",
        "text",
    ]


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


def test_analyze_uses_values_beyond_preview_and_applies_settings():
    content = ("Value\n" + "12\n" * 100 + "bad\n" * 15 + '""\n' * 5).encode()
    with TestClient(
        create_app(Settings(_env_file=None, analytics_api_key=KEY, numeric_parse_threshold=0.9))
    ) as client:
        response = client.post("/api/v1/datasets/analyze", content=content, headers=HEADERS)
    assert response.status_code == 200
    result = response.json()
    assert len(result["preview"]["rows"]) == 100
    assert result["preview"]["row_count"] == 120
    assert result["column_metadata"][0] == {
        "name": "Value",
        "detected_type": "categorical",
        "missing_count": 5,
        "missing_percentage": 4.17,
        "unique_count": 2,
        "sample_values": ["12", "bad"],
    }
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    "endpoint", ["preview", "analyze", "statistics", "recommend-visualizations"]
)
def test_both_upload_endpoints_enforce_auth_and_validation(upload_client, endpoint):
    url = f"/api/v1/datasets/{endpoint}"
    assert upload_client.post(url, content=b"A\n1").status_code == 401
    response = upload_client.post(url, content=b"A,A\n1,2", headers=HEADERS)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "duplicate_headers"
    assert upload_client.post(url, content=b"a" * 101, headers=HEADERS).status_code == 413


def test_statistics_endpoint_matches_analysis_and_uses_entire_dataset():
    content = ("Score\n" + "1\n" * 100 + "101\n").encode()
    with TestClient(create_app(Settings(_env_file=None, analytics_api_key=KEY))) as client:
        analysis = client.post("/api/v1/datasets/analyze", content=content, headers=HEADERS)
        statistics = client.post("/api/v1/datasets/statistics", content=content, headers=HEADERS)
    assert analysis.status_code == statistics.status_code == 200
    assert statistics.json() == analysis.json()["statistics"]
    assert statistics.headers["cache-control"] == "no-store"
    assert statistics.json()["columns"][0]["maximum"] == 101
    assert statistics.json()["columns"][0]["mean"] == pytest.approx(201 / 101)
    assert statistics.json()["summary"]["row_count"] == 101


def test_recommendation_endpoint_matches_analysis_and_uses_full_data():
    content = ("Score\n" + "1\n" * 100 + "2\n").encode()
    with TestClient(create_app(Settings(_env_file=None, analytics_api_key=KEY))) as client:
        analysis = client.post("/api/v1/datasets/analyze", content=content, headers=HEADERS)
        result = client.post(
            "/api/v1/datasets/recommend-visualizations", content=content, headers=HEADERS
        )
    assert analysis.status_code == result.status_code == 200
    assert result.json()["recommendations"] == analysis.json()["recommendations"]
    assert result.json()["recommendations"][0]["chart_type"] == "histogram"
    assert result.json()["recommendations"][0]["valid_rows"] == 101
    assert result.headers["cache-control"] == "no-store"
