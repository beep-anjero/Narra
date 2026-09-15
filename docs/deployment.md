# Deployment

Narra needs two processes and a Supabase project. The frontend cannot be deployed
as a static export: its auth, upload, persistence, and filtering routes run on Node.

## Containers

Copy `.env.example` to a root `.env`, fill the two public Supabase values and a
random private `ANALYTICS_API_KEY`, and apply all migrations before running:

```sh
docker compose build
docker compose up -d
docker compose ps
```

The public Supabase URL/key are baked into the frontend build; rebuild when they
change. Private analytics credentials are runtime environment variables and never
build arguments. `.dockerignore` excludes local environment files, dependency
directories, test artifacts, and Git history. Both images run as non-root users.

Compose exposes only the web service on `NARRA_PORT` (default 3000). Analytics stays
on the internal network. Its shared key still protects dataset endpoints. Health
checks are `/api/health` for web and `/api/v1/health` for analytics; these are liveness
checks, not proof of Supabase availability or successful analysis.

Docker was unavailable on the implementation host. The Next.js standalone build
and browser suite were checked locally, but image builds and container startup
must be verified on a Docker host before deploying. No hosted URL is configured.

## HTTPS and hosting constraints

Terminate HTTPS at a reverse proxy. Preserve the original HTTP Host and reject
unrecognized hostnames. Narra validates Origin against Host and deliberately ignores
untrusted `X-Forwarded-Host`. Configure Supabase Site URL and redirect URLs for the
exact public origin, and verify email confirmation links there.

CSV files upload directly from the browser to private Supabase Storage. Vercel only
authorizes the upload and passes a short-lived signed reference to analytics, so its
function request-body limit does not cap CSV size. Keep `MAX_UPLOAD_SIZE_BYTES` aligned
between both services and the Storage bucket. Apply the latest Storage-limit migration.

Set `SUPABASE_STORAGE_ORIGIN` on analytics to the exact HTTPS Supabase project origin
(normally the same as `NEXT_PUBLIC_SUPABASE_URL`). Render rejects signed links from
other hosts and downloads at most the configured byte limit. The default is 25 MiB;
load-test memory and execution time before raising it toward the 100 MiB hard ceiling.

Keep analytics private where possible. Apply request/concurrency limits at the
proxy, especially to public demo filtering, and monitor memory and processing time.
The current cache is per process. One worker is simplest; multiple workers can
produce cache misses that rehydrate from saved Storage, increasing processing cost.
Load-test your expected row/column widths: the upload-byte limit is not a bound on
pandas memory. Reduce `MAX_DATASET_ROWS` for constrained machines.

## Managed process alternative

Build with `pnpm install --frozen-lockfile` and `pnpm build`; run `pnpm start` from
the repository root. The startup script copies static assets into the generated
standalone tree. The trace includes all five sample CSVs. Do not copy local `.env`
files into deployment bundles. A fresh build in a clean CI environment is preferred.

Run analytics separately with Python 3.13:

```sh
uv sync --directory apps/analytics --locked --no-dev
uv run --directory apps/analytics --locked --no-dev uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

Set `ANALYTICS_API_URL` on the web server and the same private key on both servers.
Use HTTPS if those servers communicate across public networks. Browser CORS is not
needed for this server-to-server integration.

## Data operations and recovery

- Apply migrations once, in filename order. Back up PostgreSQL and Storage before
  subsequent schema changes; they contain distinct parts of a saved analysis.
- A dashboard snapshot can reopen while FastAPI is offline. Filtering requires the
  original private CSV and analytics service. Filter failure preserves the display.
- Project deletion calls Storage removal before database deletion. If interrupted,
  retry through Settings. If files were removed but database deletion failed, the
  snapshot may remain readable while filtering cannot restore the CSV; finish deletion.
- Interrupted uploads may leave owner-private orphan objects. Periodically compare
  objects in the `datasets` bucket with `datasets.storage_path`, allow a grace period
  for in-flight uploads, and investigate uncertain saves before removing orphans
  through the Storage API. Never delete `storage.objects` metadata directly in SQL.
- Account deletion also requires Storage cleanup before cascading projects. V1 has
  no account-deletion UI; use a deliberate administrator maintenance process.
- Logs and failed test traces may contain dataset values or account details. Keep
  them private and apply a retention policy; do not commit them.

Before release, run the [signed-in lifecycle test](testing.md), verify another user
cannot access the project or Storage objects, and test recovery after restarting
analytics. Record the actual deployment URL and environment-specific checks only
after they have been performed.
