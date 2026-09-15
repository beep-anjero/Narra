import csv
import io
import re
from dataclasses import dataclass

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
DELIMITERS = ",;\t"


@dataclass(frozen=True)
class ParsedCsv:
    preview: DatasetPreview
    frame: pd.DataFrame


def _decode(content: bytes) -> tuple[str, str]:
    for encoding in ("utf-8-sig", "windows-1252"):
        try:
            return content.decode(encoding), "UTF-8" if encoding == "utf-8-sig" else "Windows-1252"
        except UnicodeDecodeError:
            continue
    raise DatasetError(
        "unsupported_encoding",
        "Narra could not read this file. Save it as UTF-8 or Windows-1252 CSV.",
    )


def _dialect_and_start(text: str) -> tuple[str, int]:
    lines = text.splitlines(keepends=True)
    start = 0
    explicit: str | None = None
    while start < len(lines):
        stripped = lines[start].strip()
        if not stripped or stripped.startswith("#"):
            start += 1
            continue
        if stripped.lower().startswith("sep=") and len(stripped) == 5:
            explicit = stripped[-1]
            start += 1
            continue
        break
    sample_lines = [
        line
        for line in lines[start : start + 25]
        if line.strip() and not line.lstrip().startswith("#")
    ]
    sample = "".join(sample_lines)
    if not sample:
        return explicit or ",", start
    if explicit is not None and explicit in DELIMITERS:
        return explicit, start
    try:
        return csv.Sniffer().sniff(sample, delimiters=DELIMITERS).delimiter, start
    except csv.Error:
        return ",", start


def _looks_like_header(first: list[str], following: list[list[str]]) -> bool:
    if not following:
        return True
    numeric = re.compile(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?")
    if all(numeric.fullmatch(value.strip()) for value in first if value.strip()):
        return False
    return True


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


def read_csv(
    content: bytes,
    filename: str,
    mime_type: str,
    max_bytes: int,
    max_rows: int,
    *,
    preview_only: bool = False,
    delimiter_override: str | None = None,
    header_row: int | None = None,
    headerless: bool | None = None,
) -> ParsedCsv:
    safe_name = validate_file_metadata(filename, mime_type)
    if len(content) > max_bytes:
        raise DatasetError(
            "file_too_large", f"This CSV exceeds the {max_bytes:,}-byte upload limit.", 413
        )
    if not content:
        raise DatasetError(
            "empty_file", "This CSV is empty. Choose a file with a header and data rows."
        )
    text, encoding = _decode(content)
    if "\x00" in text:
        raise DatasetError(
            "invalid_content",
            "This file contains binary or unsupported text content. Export it as UTF-8 CSV.",
        )
    delimiter, start = _dialect_and_start(text)
    if delimiter_override is not None and delimiter_override in DELIMITERS:
        delimiter = delimiter_override
    if header_row is not None:
        start = header_row - 1
    prepared = "".join(text.splitlines(keepends=True)[start:])
    reader = csv.reader(io.StringIO(prepared, newline=""), delimiter=delimiter, strict=True)
    try:
        records = [row for row in reader if row]
        while records and len(records[0]) == 1 and records[0][0].lstrip().startswith("#"):
            records.pop(0)
        if not records:
            raise DatasetError(
                "missing_header", "Narra could not find a header or any data rows in this CSV."
            )
        width = len(records[0])
        # A title or source line sometimes appears above the real table.
        while width == 1 and len(records) > 1 and len(records[1]) > 1:
            records.pop(0)
            width = len(records[0])
        first = records.pop(0)
        matching = [row for row in records if len(row) == width]
        has_header = (
            not headerless if headerless is not None else _looks_like_header(first, matching)
        )
        headers = first if has_header else [f"Column {index + 1}" for index in range(width)]
        if not has_header:
            records.insert(0, first)
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
        while (
            records
            and len(records[-1]) == 1
            and (
                records[-1][0].lstrip().startswith("#")
                or records[-1][0].strip().lower().startswith(("note:", "source:"))
            )
        ):
            records.pop()
        row_count = 0
        normalized = io.StringIO(newline="")
        writer = csv.writer(normalized)
        writer.writerow(headers)
        for row in records:
            if len(row) != len(headers):
                raise DatasetError(
                    "malformed_record",
                    f"A CSV row has {len(row)} fields; expected {len(headers)}. "
                    "Check for unescaped delimiters, broken quotes, or footer text.",
                )
            row_count += 1
            if row_count > max_rows:
                raise DatasetError(
                    "too_many_rows", f"This CSV exceeds the {max_rows:,}-row limit.", 413
                )
            if not preview_only or row_count <= 100:
                writer.writerow(row)
    except csv.Error as exc:
        raise DatasetError(
            "malformed_csv",
            f"Narra could not parse the CSV near line {reader.line_num}. "
            "Check quotes and field lengths.",
        ) from exc
    if row_count == 0:
        raise DatasetError("no_data", "This CSV has a header but no data rows.")
    # Both parsers consume the same validated records. Normalization preserves
    # quoted empty cells and whitespace-only records that pandas otherwise skips.
    normalized.seek(0)
    try:
        frame = pd.read_csv(
            normalized,
            dtype=str,
            na_filter=False,
            keep_default_na=False,
            skip_blank_lines=False,
            names=headers,
            header=0,
        )
    except (pd.errors.ParserError, pd.errors.EmptyDataError, ValueError) as exc:
        raise DatasetError(
            "malformed_csv", "Narra could not parse this CSV. Check delimiters and quoting."
        ) from exc
    preview = DatasetPreview(
        filename=safe_name,
        file_size=len(content),
        row_count=row_count,
        column_count=len(headers),
        columns=headers,
        rows=frame.head(100).values.tolist(),
        truncated=row_count > 100,
        delimiter="tab" if delimiter == "\t" else delimiter,
        encoding=encoding,
        header_row=start + 1,
        generated_headers=not has_header,
        skipped_rows=start,
        warnings=(
            ["Column names were generated because Narra treated the first row as data."]
            if not has_header
            else []
        ),
    )
    return ParsedCsv(preview=preview, frame=frame)


def parse_csv(
    content: bytes,
    filename: str,
    mime_type: str,
    max_bytes: int,
    max_rows: int,
    **options,
) -> DatasetPreview:
    """Compatibility wrapper for the Stage 6 temporary-preview endpoint."""
    return read_csv(
        content, filename, mime_type, max_bytes, max_rows, preview_only=True, **options
    ).preview
