import secrets
from urllib.parse import unquote
from uuid import UUID

from fastapi import APIRouter, Request, Response
from starlette.concurrency import run_in_threadpool

from app.schemas.dataset import ColumnMetadata, DatasetAnalysis, DatasetPreview
from app.schemas.error import ErrorResponse
from app.schemas.filters import FilterContext, FilterRequest
from app.schemas.insight import DatasetInsights
from app.schemas.statistics import DatasetStatistics
from app.schemas.visualization import VisualizationRecommendations
from app.services.chart_data import prepare_chart_data
from app.services.csv_parser import ParsedCsv, parse_csv, read_csv, validate_file_metadata
from app.services.dashboard_filters import apply_filters, filter_fields
from app.services.errors import DatasetError
from app.services.insight_generator import generate_insights
from app.services.schema_detector import infer_schema
from app.services.statistics import calculate_statistics
from app.services.visualization_recommender import recommend_visualizations
from app.settings import Settings

router = APIRouter(tags=["Datasets"])
ERROR_RESPONSES = {status: {"model": ErrorResponse} for status in (401, 413, 415, 422, 503)}


def _service_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    if settings.analytics_api_key is None:
        raise DatasetError(
            "service_not_configured", "The upload service has not been configured.", 503
        )
    expected = f"Bearer {settings.analytics_api_key.get_secret_value()}"
    if not secrets.compare_digest(
        request.headers.get("authorization", "").encode(), expected.encode()
    ):
        raise DatasetError("unauthorized", "A valid service credential is required.", 401)
    return settings


def _scope(request: Request) -> str | None:
    user, project = request.headers.get("x-narra-user"), request.headers.get("x-narra-project")
    if user is None and project is None:
        return None
    try:
        return f"{UUID(user or '')}:{UUID(project or '')}"
    except ValueError as error:
        raise DatasetError(
            "invalid_scope", "A valid user and project context is required."
        ) from error


async def _validated_upload(request: Request) -> tuple[bytes, str, str, Settings]:
    settings = _service_settings(request)
    try:
        filename = unquote(request.headers.get("x-filename", ""), errors="strict")
    except UnicodeDecodeError as exc:
        raise DatasetError("invalid_filename", "Choose a CSV with a valid filename.") from exc
    mime = request.headers.get("content-type", "")
    validate_file_metadata(filename, mime)
    content = bytearray()
    async for chunk in request.stream():
        if len(content) + len(chunk) > settings.max_upload_size_bytes:
            raise DatasetError(
                "file_too_large",
                f"This CSV exceeds the {settings.max_upload_size_bytes:,}-byte upload limit.",
                413,
            )
        content.extend(chunk)
    return bytes(content), filename, mime, settings


@router.post(
    "/datasets/preview",
    response_model=DatasetPreview,
    responses=ERROR_RESPONSES,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}},
        }
    },
)
async def preview_dataset(request: Request, response: Response) -> DatasetPreview:
    content, filename, mime, settings = await _validated_upload(request)
    result = await run_in_threadpool(
        parse_csv,
        bytes(content),
        filename,
        mime,
        settings.max_upload_size_bytes,
        settings.max_dataset_rows,
    )
    response.headers["Cache-Control"] = "no-store"
    return result


@router.post(
    "/datasets/analyze",
    response_model=DatasetAnalysis,
    responses=ERROR_RESPONSES,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}},
        }
    },
)
async def analyze_dataset(request: Request, response: Response) -> DatasetAnalysis:
    parsed, metadata = await _dataset_with_schema(request)
    statistics = await run_in_threadpool(calculate_statistics, parsed.frame, metadata)
    recommendations = await run_in_threadpool(recommend_visualizations, parsed.frame, metadata)
    charts = await run_in_threadpool(prepare_chart_data, parsed.frame, recommendations)
    insights = await run_in_threadpool(generate_insights, parsed.frame, metadata)
    result = DatasetAnalysis(
        preview=parsed.preview,
        column_metadata=metadata,
        statistics=statistics,
        recommendations=recommendations,
        charts=charts,
        insights=insights,
    )
    scope = _scope(request)
    if scope:
        fields = await run_in_threadpool(filter_fields, parsed.frame, result)
        token = request.app.state.analysis_cache.put(scope, parsed, result, fields)
        if token:
            result.filter_context = FilterContext(token=token, fields=fields)
    response.headers["Cache-Control"] = "no-store"
    return result


async def _dataset_with_schema(request: Request) -> tuple[ParsedCsv, list[ColumnMetadata]]:
    content, filename, mime, settings = await _validated_upload(request)
    parsed = await run_in_threadpool(
        read_csv,
        content,
        filename,
        mime,
        settings.max_upload_size_bytes,
        settings.max_dataset_rows,
    )
    metadata = await run_in_threadpool(infer_schema, parsed.frame, settings)
    return parsed, metadata


@router.post(
    "/datasets/statistics",
    response_model=DatasetStatistics,
    responses=ERROR_RESPONSES,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}},
        }
    },
)
async def dataset_statistics(request: Request, response: Response) -> DatasetStatistics:
    parsed, metadata = await _dataset_with_schema(request)
    result = await run_in_threadpool(calculate_statistics, parsed.frame, metadata)
    response.headers["Cache-Control"] = "no-store"
    return result


@router.post(
    "/datasets/recommend-visualizations",
    response_model=VisualizationRecommendations,
    responses=ERROR_RESPONSES,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}},
        }
    },
)
async def dataset_recommendations(
    request: Request, response: Response
) -> VisualizationRecommendations:
    parsed, metadata = await _dataset_with_schema(request)
    result = await run_in_threadpool(recommend_visualizations, parsed.frame, metadata)
    response.headers["Cache-Control"] = "no-store"
    return VisualizationRecommendations(recommendations=result)


@router.post(
    "/datasets/generate-insights", response_model=DatasetInsights, responses=ERROR_RESPONSES
)
async def dataset_insights(request: Request, response: Response) -> DatasetInsights:
    parsed, metadata = await _dataset_with_schema(request)
    result = await run_in_threadpool(generate_insights, parsed.frame, metadata)
    response.headers["Cache-Control"] = "no-store"
    return DatasetInsights(insights=result)


@router.post("/datasets/filter", response_model=DatasetAnalysis, responses=ERROR_RESPONSES)
async def filtered_dataset(request: Request, response: Response) -> DatasetAnalysis:
    settings = _service_settings(request)
    scope = _scope(request)
    if scope is None:
        raise DatasetError("unauthorized", "User and project context is required.", 401)
    content = bytearray()
    async for chunk in request.stream():
        if len(content) + len(chunk) > 65536:
            raise DatasetError(
                "request_too_large", "Filter requests must be smaller than 64 KiB.", 413
            )
        content.extend(chunk)
    try:
        filters = FilterRequest.model_validate_json(bytes(content))
    except ValueError as error:
        raise DatasetError("invalid_filter", "The dashboard filters are invalid.") from error
    entry = request.app.state.analysis_cache.get(filters.token, scope)
    result = await run_in_threadpool(apply_filters, entry, filters, settings)
    result.filter_context = entry.analysis.filter_context
    response.headers["Cache-Control"] = "no-store"
    return result
