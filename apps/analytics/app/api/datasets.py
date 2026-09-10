import secrets
from urllib.parse import unquote

from fastapi import APIRouter, Request, Response
from starlette.concurrency import run_in_threadpool

from app.schemas.dataset import ColumnMetadata, DatasetAnalysis, DatasetPreview
from app.schemas.error import ErrorResponse
from app.schemas.statistics import DatasetStatistics
from app.schemas.visualization import VisualizationRecommendations
from app.services.csv_parser import ParsedCsv, parse_csv, read_csv, validate_file_metadata
from app.services.errors import DatasetError
from app.services.schema_detector import infer_schema
from app.services.statistics import calculate_statistics
from app.services.visualization_recommender import recommend_visualizations
from app.settings import Settings

router = APIRouter(tags=["Datasets"])
ERROR_RESPONSES = {status: {"model": ErrorResponse} for status in (401, 413, 415, 422, 503)}


async def _validated_upload(request: Request) -> tuple[bytes, str, str, Settings]:
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
    result = DatasetAnalysis(
        preview=parsed.preview,
        column_metadata=metadata,
        statistics=statistics,
        recommendations=recommendations,
    )
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
