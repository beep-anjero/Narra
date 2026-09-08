import secrets
from urllib.parse import unquote

from fastapi import APIRouter, Request, Response
from starlette.concurrency import run_in_threadpool

from app.schemas.dataset import DatasetPreview
from app.schemas.error import ErrorResponse
from app.services.csv_parser import parse_csv, validate_file_metadata
from app.services.errors import DatasetError
from app.settings import Settings

router = APIRouter(tags=["Datasets"])


@router.post(
    "/datasets/preview",
    response_model=DatasetPreview,
    responses={status: {"model": ErrorResponse} for status in (401, 413, 415, 422, 503)},
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}},
        }
    },
)
async def preview_dataset(request: Request, response: Response) -> DatasetPreview:
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
