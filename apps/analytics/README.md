# Narra analytics service

Stage 8 adds descriptive statistics to the authenticated CSV workflow. It validates UTF-8 CSV
uploads, headers, duplicate columns, malformed records, actual byte and row limits,
and returns no more than 100 preview rows plus metadata calculated from all rows.
Files are not persisted yet.

## Local development

Install Python 3.13 and uv (verified with Python 3.13.9 and uv 0.12.8).
From the repository root:

```sh
uv sync --directory apps/analytics --locked
pnpm analytics:dev
```

The virtual environment lives in `apps/analytics/.venv`. Dependencies are pinned
in `pyproject.toml` and `uv.lock`. pnpm manages JavaScript; uv manages Python.

- Liveness: `http://127.0.0.1:8000/api/v1/health`
- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI schema: `http://127.0.0.1:8000/openapi.json`

```json
{ "status": "ok", "service": "narra-analytics", "version": "0.1.0" }
```

Health is public and reports process liveness, not Supabase connectivity or dataset
processing readiness. Preview, schema analysis, and statistics endpoints are implemented.

## Configuration

Optional `apps/analytics/.env`:

```dotenv
CORS_ORIGINS=["http://127.0.0.1:3000","http://localhost:3000"]
ANALYTICS_API_KEY=replace-with-the-same-random-32-plus-character-value-used-by-web
MAX_UPLOAD_SIZE_BYTES=20971520
MAX_DATASET_ROWS=100000
```

These are also the defaults. Environment variables override this file. Copy only
analytics settings, not the entire root `.env.example`; unrelated keys in this file
fail validation. An empty JSON array disables cross-origin browser access. HTTP(S)
origins are normalized and validated; credentials, wildcards, paths, queries, and
fragments are rejected. Restart after changing configuration.

GET and POST are allowed by CORS. Cookies are not allowed. CORS is a browser policy,
not authentication. CSV preview requires `Authorization: Bearer <ANALYTICS_API_KEY>`.
The Next.js server adds that header after verifying the session and project owner.
The key is mandatory for preview processing but health remains public.

## CSV preview endpoint

`POST /api/v1/datasets/preview` accepts a raw CSV body with `Content-Type` and a
percent-encoded `X-Filename` header. It is designed for Narra's server-to-server
request, not direct browser access. Its response includes the original safe filename,
file size, full row and column counts, headers, and the first 100 data rows.

CSV must be UTF-8 (a BOM is accepted), contain a nonempty header, use unique names,
and have consistent field counts. The parser checks every row before emitting the
preview, including records after row 100. It keeps cell values as strings, preserving
IDs such as `0012`, literal `NA`, and empty cells for the schema stage. The limits
default to 20 MiB and 100,000 data rows and are configured server-side.

## Schema analysis endpoint

`POST /api/v1/datasets/analyze` accepts the same authenticated raw CSV request as
preview. Its response is `{preview, column_metadata, statistics}`; each metadata item contains
`name`, `detected_type`, `missing_count`, `missing_percentage`, `unique_count`, and
`sample_values`. The existing preview endpoint retains its original response.

Rules run in this order on all non-missing values:

1. Boolean: case-insensitive true/false, yes/no, y/n, t/f; 0/1 only with a name such
   as `is_active`, `flag`, or `enabled`. Unhinted 0/1 measurements remain numeric.
2. Numeric: at least 90% parse as finite numbers, including decimal/exponent forms
   and valid comma thousands grouping. Currency signs and malformed separators are
   not stripped. Original strings, including leading zeros, remain in the preview.
3. Datetime: at least 90% parse as full year-month-day or slash-separated calendar
   dates, optionally with time/offset. Ambiguous slash dates use pandas' month-first
   preference. Pure integers, partial dates, and time-only strings are excluded.
4. Categorical: unique non-missing strings / non-missing rows is at most 0.5.
5. Text: fallback, including entirely missing columns.

Missing means empty or whitespace-only cells (or nulls in a supplied DataFrame).
Literal `NA`, `NULL`, and `NaN` remain data. Counts include all validated rows;
samples contain the first five distinct original non-missing strings. Mixed columns
can pass a 90% threshold with invalid values remaining; these values are not dropped.

Optional `apps/analytics/.env` settings:

```dotenv
NUMERIC_PARSE_THRESHOLD=0.9
DATETIME_PARSE_THRESHOLD=0.9
CATEGORICAL_UNIQUE_RATIO_THRESHOLD=0.5
SCHEMA_SAMPLE_SIZE=5
```

Parse thresholds accept 0.5–1, categorical ratio 0–1, and samples 1–5.

## Statistics

`POST /api/v1/datasets/statistics` accepts the same authenticated CSV request and
returns `{summary, columns}`. The identical object is included in `/datasets/analyze`,
so a normal upload does not send its CSV twice. No persistence or database change
is involved. The preview-only endpoint remains unchanged.

- Numeric: valid count, missing, invalid count, mean, median, sample standard
  deviation (`ddof=1`), minimum, maximum, Q1, and Q3 (linear interpolation).
- Categorical, boolean, and text: non-missing count, original-string unique count,
  most frequent value, frequency, and up to ten categories. Ties sort by value;
  original spelling and whitespace are preserved. Boolean spellings are not merged.
- Datetime: valid count, missing, invalid count, earliest/latest ISO timestamps in
  UTC, and elapsed days. Period aggregations are deferred to chart preparation.
- Dataset: rows, columns, total/missing cells, missing percentage, complete rows,
  and column counts for all five types. Complete means no blank cells, not that
  every value parses successfully.

Missing and parse failures are distinct. Numeric/datetime summaries exclude invalid
values from calculations and report `invalid_count`; source data is unchanged.
Unique counts still describe original non-missing strings, including invalid ones.
Percentages are rounded to two decimals. Undefined standard deviation (one value)
and unrepresentable floating-point results are `null`, never NaN or Infinity.
Calculations use float64 precision, so very large integer measurements may round.
Shared conversion helpers enforce the same rules as schema inference. Numeric
scaling avoids intermediate overflow in sums and squared deviations.

The web contract validates and retains these statistics for Stage 9. It temporarily
accepts responses without statistics to support an independently deployed Stage 7
analytics service. No statistics panel is implemented in Stage 8.

## Architecture

- `app/main.py`: application factory and composition.
- `app/settings.py`: validated Pydantic settings.
- `app/api/`: thin versioned router, health handler, and error handlers.
- `app/schemas/`: strict Pydantic response models.
- `app/services/csv_parser.py`: strict validation and bounded pandas preview parsing.
- `app/services/schema_detector.py`: full-data classification and column metadata.
- `app/services/column_values.py`: shared missing, numeric, and datetime conversion.
- `app/services/statistics.py`: independent full-data descriptive statistics.
- `app/models/`, `app/utils/`: reserved until needed.
- `tests/`: pytest HTTP, settings, CORS, and failure-contract tests.

Errors use `{"error":{"code":"...","message":"..."}}`. Unknown routes and
unsupported methods return 404 and 405. Request validation errors do not echo input
values. Unhandled exceptions produce a generic 500 response and a server-side
traceback for diagnosis. CORS preflight responses are managed by middleware.

Pandas and NumPy support the current CSV preview. There is no multipart parsing,
persistence, or LLM dependency.

## Verification

```sh
pnpm analytics:check
pnpm check:all
```

The first runs Ruff lint/format checks and pytest. The second also runs all web
checks and the production frontend build. Format Python with:

```sh
uv run --directory apps/analytics --locked ruff format .
```

Tests use the ASGI test client and need no running server or external service.

## Production process

Install runtime dependencies and start without reload:

```sh
uv sync --directory apps/analytics --locked --no-dev
uv run --directory apps/analytics --locked --no-dev uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Configure the exact web origin in `CORS_ORIGINS`, terminate HTTPS at the hosting
proxy, and use `/api/v1/health` as the liveness probe. FastAPI runs separately from
Next.js. No deployment has been performed in Stage 5.
