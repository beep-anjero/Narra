import csv
import io
import re

import pandas as pd

from app.schemas.dataset import DatasetPreview
from app.services.errors import DatasetError

CSV_MIME_TYPES = {
    "",
    "text/csv",
    "application/csv",
    "text/plain",
    "application/vnd.ms-excel",
    "application/octet-stream",
}


def validate_file_metadata(filename: str, mime_type: str) -> str:
    if not filename or len(filename) > 255 or any(ord(c) < 32 for c in filename):
        raise DatasetError("invalid_filename", "Choose a CSV with a valid filename.")
    safe_name = filename.replace("\\", "/").rsplit("/", 1)[-1]
    if not safe_name.lower().endswith(".csv"):
        raise DatasetError("unsupported_file", "Only .csv files are supported.", 415)
    if mime_type.split(";", 1)[0].strip().lower() not in CSV_MIME_TYPES:
        raise DatasetError(
            "unsupported_media_type", "This file type is not supported. Export it as CSV.", 415
        )
    return safe_name


def parse_csv(
    content: bytes, filename: str, mime_type: str, max_bytes: int, max_rows: int
) -> DatasetPreview:
    safe_name = validate_file_metadata(filename, mime_type)
    if len(content) > max_bytes:
        raise DatasetError(
            "file_too_large", f"This CSV exceeds the {max_bytes:,}-byte upload limit.", 413
        )
    if not content:
        raise DatasetError(
            "empty_file", "This CSV is empty. Choose a file with a header and data rows."
        )
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise DatasetError(
            "unsupported_encoding", "Narra could not read this encoding. Export the CSV as UTF-8."
        ) from exc
    if "\x00" in text:
        raise DatasetError(
            "invalid_content",
            "This file contains binary or unsupported text content. Export it as UTF-8 CSV.",
        )
    reader = csv.reader(io.StringIO(text, newline=""), strict=True)
    try:
        headers = next(reader, None)
        if not headers or any(not header.strip() for header in headers):
            raise DatasetError(
                "missing_header",
                "Narra could not detect a valid header row. Every column needs a name.",
            )
        headers = [header.strip() for header in headers]
        if len(headers) > 200 or any(len(header) > 200 for header in headers):
            raise DatasetError(
                "unsupported_dataset",
                "Use at most 200 columns with names of at most 200 characters.",
            )
        if len(set(headers)) != len(headers):
            raise DatasetError("duplicate_headers", "This CSV contains duplicate column names.")
        # Numeric-only first records are almost certainly data, not meaningful headers.
        # Text-only headerless CSV cannot be inferred reliably: first record is the contract.
        if all(re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?", h) for h in headers):
            raise DatasetError(
                "missing_header",
                "Narra could not detect a valid header row. Add column names before your data.",
            )
        row_count = 0
        preview_rows: list[list[str]] = []
        for row in reader:
            if not row:  # Ignore physically blank records, not rows containing empty cells.
                continue
            if len(row) != len(headers):
                raise DatasetError(
                    "malformed_record",
                    f"CSV record ending at line {reader.line_num} has {len(row)} fields; "
                    f"expected {len(headers)}.",
                )
            row_count += 1
            if row_count <= 100:
                preview_rows.append(row)
            if row_count > max_rows:
                raise DatasetError(
                    "too_many_rows", f"This CSV exceeds the {max_rows:,}-row limit.", 413
                )
    except csv.Error as exc:
        raise DatasetError(
            "malformed_csv",
            f"Narra could not parse the CSV near line {reader.line_num}. "
            "Check quotes and field lengths.",
        ) from exc
    if row_count == 0:
        raise DatasetError("no_data", "This CSV has a header but no data rows.")
    # Preserve identifiers, literal NA/NULL strings, and empty cells. Stage 7 owns inference.
    # Normalize only the validated preview so blank lines and quoted empty cells have
    # identical semantics between csv.reader and pandas (no full DataFrame allocation).
    preview_text = io.StringIO(newline="")
    writer = csv.writer(preview_text)
    writer.writerow(headers)
    writer.writerows(preview_rows)
    preview_text.seek(0)
    try:
        frame = pd.read_csv(
            preview_text, dtype=str, na_filter=False, nrows=100, skip_blank_lines=False
        )
    except (pd.errors.ParserError, pd.errors.EmptyDataError, ValueError) as exc:
        raise DatasetError(
            "malformed_csv", "Narra could not parse this CSV. Check delimiters and quoting."
        ) from exc
    return DatasetPreview(
        filename=safe_name,
        file_size=len(content),
        row_count=row_count,
        column_count=len(headers),
        columns=headers,
        rows=frame.values.tolist(),
        truncated=row_count > 100,
    )
