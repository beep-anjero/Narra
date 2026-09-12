import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services.analysis_cache import AnalysisCache
from app.settings import Settings

KEY = "test-filter-key-at-least-32-characters-long"
HEADERS = {
    "Authorization": f"Bearer {KEY}",
    "X-Filename": "test.csv",
    "Content-Type": "text/csv",
    "X-Narra-User": "11111111-1111-4111-8111-111111111111",
    "X-Narra-Project": "22222222-2222-4222-8222-222222222222",
}
CSV = (
    "Region,Revenue,Date\n"
    + "East,10,2026-01-01\n" * 100
    + "West,20,2026-01-02T23:59:59Z\nWest,30,2026-01-03\n"
).encode()


@pytest.fixture
def client():
    with TestClient(create_app(Settings(_env_file=None, analytics_api_key=KEY))) as result:
        yield result


def upload(client):
    response = client.post("/api/v1/datasets/analyze", content=CSV, headers=HEADERS)
    assert response.status_code == 200
    return response.json()


def filter_request(client, token, filters, headers=None):
    return client.post(
        "/api/v1/datasets/filter",
        json={"token": token, "filters": filters},
        headers={**HEADERS, "Content-Type": "application/json", **(headers or {})},
    )


def test_filters_use_full_data_and_update_all_outputs_with_stable_charts(client):
    original = upload(client)
    response = filter_request(
        client,
        original["filter_context"]["token"],
        [
            {"column": "Region", "kind": "categorical", "values": ["West"]},
            {"column": "Revenue", "kind": "numeric", "minimum": 20, "maximum": 20},
            {"column": "Date", "kind": "datetime", "start": "2026-01-02", "end": "2026-01-02"},
        ],
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["preview"]["row_count"] == result["statistics"]["summary"]["row_count"] == 1
    assert result["preview"]["rows"][0][1] == "20"
    assert len(result["recommendations"]) == len(original["recommendations"])
    assert all(item["valid_rows"] == 1 for item in result["recommendations"])
    assert all(item["error"] is None for item in result["charts"])
    assert response.headers["cache-control"] == "no-store"
    reset = filter_request(client, original["filter_context"]["token"], []).json()
    assert reset["statistics"] == original["statistics"]
    assert reset["charts"] == original["charts"]


def test_no_matches_is_successful_empty_dashboard(client):
    original = upload(client)
    response = filter_request(
        client,
        original["filter_context"]["token"],
        [{"column": "Revenue", "kind": "numeric", "minimum": 999}],
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["preview"]["rows"] == []
    assert result["statistics"]["summary"]["row_count"] == 0
    assert all(item["data"] == [] for item in result["charts"])
    assert result["insights"] == []


@pytest.mark.parametrize("header", ["X-Narra-User", "X-Narra-Project"])
def test_tokens_are_bound_to_verified_user_and_project(client, header):
    original = upload(client)
    response = filter_request(
        client,
        original["filter_context"]["token"],
        [],
        {header: "33333333-3333-4333-8333-333333333333"},
    )
    assert response.status_code == 410


@pytest.mark.parametrize(
    "filters",
    [
        [{"column": "Unknown", "kind": "numeric", "minimum": 1}],
        [{"column": "Revenue", "kind": "numeric", "minimum": 20, "maximum": 10}],
        [{"column": "Date", "kind": "datetime", "start": "2026-02-30"}],
        [{"column": "Region", "kind": "categorical", "values": ["Unknown"]}],
        [{"column": "Revenue", "kind": "categorical", "values": ["10"]}],
    ],
)
def test_invalid_filters_are_rejected(client, filters):
    original = upload(client)
    assert filter_request(client, original["filter_context"]["token"], filters).status_code == 422


def test_cache_expiry_eviction_and_capacity(client):
    client.app.state.analysis_cache = AnalysisCache(max_entries=1)
    first = upload(client)
    second = upload(client)
    assert filter_request(client, first["filter_context"]["token"], []).status_code == 410
    token = second["filter_context"]["token"]
    client.app.state.analysis_cache.entries[token].expires_at = 0
    assert filter_request(client, token, []).status_code == 410
    client.app.state.analysis_cache = AnalysisCache(max_bytes=1)
    assert upload(client)["filter_context"] is None


def test_filter_auth_and_actual_size_limit(client):
    assert client.post("/api/v1/datasets/filter", content=b"bad").status_code == 401
    assert (
        client.post("/api/v1/datasets/filter", content=b"x" * 65537, headers=HEADERS).status_code
        == 413
    )
