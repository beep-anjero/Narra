# Stage 6 verification

Verified locally on 2026-09-08. Stage 7 has not started.

## Implemented

- A drag-and-drop CSV uploader on each owned project page, with browser-side file
  checks, filename and size display, actual XHR upload progress, cancel/retry state,
  accessible messages, and a horizontally scrollable temporary preview table.
- A Next.js server Route Handler that checks request origin, validates the live
  Supabase identity, confirms project ownership, bounds actual streamed request
  bytes, and forwards the raw file only to the configured analytics service.
- FastAPI `POST /api/v1/datasets/preview`, protected by a constant-time compared
  server-only bearer key. It validates streamed size, filename extension and MIME
  type, UTF-8/BOM encoding, headers, duplicate columns, malformed records, max rows,
  and returns at most 100 rows after validating the entire CSV.
- Bounded pandas parsing with string cells. No schema, missing-value, statistics,
  chart recommendation, Supabase Storage upload, database persistence, or browser
  storage is claimed in this stage.

## Local checks

- `pnpm analytics:check`: Ruff passed and **50 pytest tests passed**.
- `pnpm check`: Prettier, ESLint with zero warnings, strict TypeScript, **97 Vitest
  tests**, and the production Next.js build passed.
- Tests cover valid CSVs (BOM, Unicode, quoted fields/newlines, IDs, literal NA,
  empty cells), all preview rows vs. complete-file validation, malformed records,
  encoding and header errors, configurable byte/row limits, FastAPI authentication,
  actual streamed-body limits, CORS, cross-origin rejection, session/project owner
  checks, backend failures, client validation, progress, retry, and preview rendering.

## Local configuration required for browser uploads

Live browser uploads require matching `ANALYTICS_API_KEY` values in both ignored files:

```dotenv
# apps/web/.env.local
ANALYTICS_API_URL=http://127.0.0.1:8000
ANALYTICS_API_KEY=<random value of at least 32 characters>
MAX_UPLOAD_SIZE_BYTES=20971520
```

```dotenv
# apps/analytics/.env
ANALYTICS_API_KEY=<the exact same value>
MAX_UPLOAD_SIZE_BYTES=20971520
MAX_DATASET_ROWS=100000
CORS_ORIGINS=["http://127.0.0.1:3000","http://localhost:3000"]
```

Run `pnpm analytics:dev`, restart `pnpm dev` after setting its environment, then
create a project and upload a UTF-8 CSV. Neither file is committed. The current local
configuration did not contain an analytics key, so an end-to-end browser upload against
the two local processes was not run. The route gives a specific configuration message
until both values are present.
