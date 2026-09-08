import pytest

from app.services.csv_parser import parse_csv
from app.services.errors import DatasetError


def parse(content: bytes, **kwargs):
    return parse_csv(
        content,
        kwargs.get("filename", "data.csv"),
        kwargs.get("mime", "text/csv"),
        kwargs.get("max_bytes", 20971520),
        kwargs.get("max_rows", 100000),
    )


def test_preserves_text_empty_values_and_quoted_content():
    result = parse(b'ID,Name,Region\r\n0012,"A, B",NA\r\n0013,"line one\nline two",\r\n')
    assert result.columns == ["ID", "Name", "Region"]
    assert result.row_count == 2
    assert result.rows == [["0012", "A, B", "NA"], ["0013", "line one\nline two", ""]]


def test_utf8_bom_unicode_and_safe_filename():
    result = parse("\ufeffName,City\nJosé,Zürich\n".encode(), filename="../data.csv")
    assert result.filename == "data.csv"
    assert result.columns == ["Name", "City"]
    assert result.rows == [["José", "Zürich"]]


def test_preview_limit_does_not_limit_full_file_validation():
    content = "Name,Value\n" + "Alice,1\n" * 150
    result = parse(content.encode())
    assert result.row_count == 150
    assert len(result.rows) == 100
    assert result.truncated
    with pytest.raises(DatasetError, match="expected 2"):
        parse((content + "bad,row,extra\n").encode())


def test_single_column_and_empty_quoted_rows():
    result = parse(b'Name\n""\n\nAlice\n')
    assert result.row_count == 2
    assert result.rows == [[""], ["Alice"]]


@pytest.mark.parametrize(
    ("content", "code"),
    [
        (b"", "empty_file"),
        (b"\n", "missing_header"),
        (b"A,B\n", "no_data"),
        (b"A,A\n1,2", "duplicate_headers"),
        (b"A, A \n1,2", "duplicate_headers"),
        (b"A,\n1,2", "missing_header"),
        (b"1,2\n3,4", "missing_header"),
        (b"A,B\n1", "malformed_record"),
        (b"A,B\n1,2,3", "malformed_record"),
        (b'A,B\n"unclosed,2', "malformed_csv"),
        (b"A\n\xff", "unsupported_encoding"),
        (b"A\n\x00", "invalid_content"),
    ],
)
def test_invalid_csv_returns_specific_errors(content: bytes, code: str):
    with pytest.raises(DatasetError) as exc:
        parse(content)
    assert exc.value.code == code


@pytest.mark.parametrize(
    ("kwargs", "code"),
    [
        ({"filename": "data.xlsx"}, "unsupported_file"),
        ({"mime": "image/png"}, "unsupported_media_type"),
        ({"max_bytes": 2}, "file_too_large"),
        ({"max_rows": 1}, "too_many_rows"),
    ],
)
def test_metadata_and_configurable_limits(kwargs, code):
    with pytest.raises(DatasetError) as exc:
        parse(b"A\n1\n2", **kwargs)
    assert exc.value.code == code


def test_column_limit():
    with pytest.raises(DatasetError, match="200 columns"):
        parse((",".join(f"c{i}" for i in range(201)) + "\n").encode())
