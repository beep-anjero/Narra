# Narra

Turn raw datasets into understandable dashboards.

Narra is a planned full-stack application that examines uploaded CSV datasets and
recommends useful statistics, visualizations, and deterministic insights. The MVP
will use rules and calculations, with no AI/LLM functionality.

**Current status: Stage 10 visualization recommendations.** The monorepo, landing
page, email/password auth, and owner-protected project creation, listing, editing,
and deletion are implemented. Apply both migrations using [Supabase setup](docs/supabase-setup.md).
Projects accept a validated CSV, infer column types from every data row, and return
up to 100 preview rows with pagination, search, and natural text sorting. Missing counts, unique counts,
and sample values appear in the schema summary. Analysis now includes full-dataset
statistics and missing-value summaries displayed in a column statistics panel.
Charts and persisted datasets remain future stages. See
[analytics setup](apps/analytics/README.md) to run the required service locally.

The landing page includes an explicitly labeled illustrative dashboard. **Try Demo
Data** links to that preview; **Analyze a Dataset** now opens registration.
Neither action uploads a file or simulates a completed analysis. The real demo flow
remains Stage 15.

## Implemented foundation

- Next.js 16 App Router and React 19.
- Strict TypeScript with checked indexed access and `@/*` imports.
- Tailwind CSS v4, neutral theme tokens, and shadcn/ui configuration.
- Accessible base layout with page metadata, language, and a skip link.
- pnpm workspace scripts, exact dependency versions, and lockfile.
- ESLint with Next.js/TypeScript rules and Prettier formatting.
- Environment example, Git ignore rules, and reserved application directories.
- Narra wordmark and favicon, forest-green theme, and locally served Geist font.
- Desktop navigation, accessible mobile drawer, hero, dashboard illustration,
  How It Works, planned features, closing CTA, and footer.
- shadcn Button, Card, Badge, Dialog, Sheet, Input, and Label primitives.
- Supabase SSR session refresh, server-validated login/registration, email
  confirmation, browser-local logout, and protected routes.
- A profile table synchronized with Auth, plus owner-only reads enforced by RLS.
- Project creation, owner-protected persistence, settings, and deletion.
- CSV file validation, streamed upload limits, and temporary previews through a
  server-only FastAPI integration; uploads are not persisted in Stage 6.
- Full-dataset schema inference for numeric, categorical, datetime, boolean, and
  text columns, with missing counts/percentages, unique values, and bounded samples.
- Independent statistics service: numeric summaries, categorical frequencies,
  datetime ranges, and dataset completeness, with typed API responses.
- Paginated preview with column type badges, missing-cell labels, preview search,
  and sorting; full-dataset statistics and an owner-protected dataset workspace.
- Deterministic ranked visualization recommendations with compatibility rules,
  usable-row checks, bounded scoring, and up to six suggestions per dataset.
- Vitest/React Testing Library tests for forms, navigation, auth actions, route
  guards, confirmation links, and redirects; PostgreSQL migration/RLS tests.

## Repository structure

```text
narra/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/ui/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/api/
│   │   ├── stores/
│   │   ├── types/
│   │   └── tests/
│   └── analytics/           # FastAPI service, Python environment, and pytest tests
│       ├── app/
│       │   ├── api/
│       │   ├── models/
│       │   ├── services/
│       │   ├── schemas/
│       │   └── utils/
│       └── tests/
├── packages/
│   ├── ui/                 # Reserved for shared components
│   └── shared/             # Reserved for shared contracts
├── supabase/migrations/    # Auth profiles and initial RLS
├── docs/
├── sample-data/            # Populated in the demo-data stage
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

Git tracks currently empty directories using `.gitkeep` files. The Python service
and reserved shared directories are not pnpm packages yet.

## Local development

Prerequisites: Node.js 24 (verified with 24.11.0), pnpm 11.19.0, and Git.

Install pnpm if it is not already available:

```sh
npm install --global pnpm@11.19.0
```

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The landing page and local test suite
run without external services. Account registration/login require a Supabase
project and `apps/web/.env.local`; see [setup instructions](docs/supabase-setup.md).
Without configuration, auth forms show an availability message and cannot submit.
Python is required for CSV analysis; see the analytics setup below.

To run a production build locally:

```sh
pnpm build
pnpm start
```

## Commands and verification

| Command             | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `pnpm dev`          | Start the Next.js development server                          |
| `pnpm build`        | Create the production frontend build                          |
| `pnpm start`        | Serve the production build                                    |
| `pnpm lint`         | Run ESLint with zero warnings permitted                       |
| `pnpm typecheck`    | Generate Next.js route types and run strict TypeScript checks |
| `pnpm format`       | Format supported source and documentation files               |
| `pnpm format:check` | Check formatting without changing files                       |
| `pnpm test`         | Run component, auth, and embedded PostgreSQL tests            |
| `pnpm test:watch`   | Run tests in watch mode                                       |
| `pnpm check`        | Check formatting, lint, types, tests, and production build    |

Run `pnpm test` for the Vitest/React Testing Library suite, or `pnpm test:watch`
during development. `pnpm check` also runs tests before the production build.
The suite covers validation, safe return URLs, provider errors, cookie refresh,
independent server route guards, email confirmation, signup/login/logout actions,
auth form feedback, and the mobile drawer. SQL tests run the actual migration in
PGlite, using PostgreSQL roles to verify profile isolation and client write denial.

Provider calls are mocked in unit tests; UI tests use jsdom. These do not verify
live Supabase or browser layout, and do not replace future Playwright E2E tests.
The analytics service uses pytest and Ruff. Run `pnpm analytics:dev` to start it,
`pnpm analytics:check` to check Python, or `pnpm check:all` to verify both apps.
Install Python 3.13 and uv, then run `uv sync --directory apps/analytics --locked`
before these commands. Playwright remains scheduled for a later stage.

## Environment variables

The root [`.env.example`](.env.example) documents current and future integrations.
Stage 3 consumes the two public Supabase variables. Copy those entries into
`apps/web/.env.local`; Next.js does not automatically read a root monorepo `.env`.

| Variable                               | Consumer               | Purpose                                        |
| -------------------------------------- | ---------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Web                    | Supabase project URL                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Web                    | Public Supabase key, with RLS enforcing access |
| `ANALYTICS_API_URL`                    | Web server             | FastAPI base URL for project CSV preview       |
| `ANALYTICS_API_KEY`                    | Web server + analytics | Matching server-only key for CSV preview       |
| `MAX_UPLOAD_SIZE_BYTES`                | Web + analytics        | CSV byte limit; defaults to 20 MiB             |
| `MAX_DATASET_ROWS`                     | Analytics              | CSV data-row limit; defaults to 100,000        |
| `CORS_ORIGINS`                         | Analytics              | JSON array of allowed HTTP(S) web origins      |

Local `.env` files are ignored by Git. No service-role key is needed for the current frontend.
Never place private credentials in variables prefixed with `NEXT_PUBLIC_`.

## CSV preview local setup

Generate one random value with at least 32 characters and place the exact same value
in the ignored local files below. The key authenticates the web server to FastAPI;
it is never sent to the browser.

```dotenv
# apps/web/.env.local
ANALYTICS_API_URL=http://127.0.0.1:8000
ANALYTICS_API_KEY=<your-random-key>
MAX_UPLOAD_SIZE_BYTES=20971520
```

```dotenv
# apps/analytics/.env
ANALYTICS_API_KEY=<the-same-random-key>
MAX_UPLOAD_SIZE_BYTES=20971520
MAX_DATASET_ROWS=100000
CORS_ORIGINS=["http://127.0.0.1:3000","http://localhost:3000"]
```

Start `pnpm analytics:dev`, then restart `pnpm dev`. Create a project and use its
upload panel to validate and preview a UTF-8 CSV. Files are not retained after a
refresh until Stage 14 adds Supabase Storage and project dataset persistence.

## Architecture and planned stack

The frontend will use Next.js, TypeScript, React, Tailwind CSS, shadcn/ui, Apache
ECharts, Zod, and Zustand when dashboard state needs it. FastAPI will handle data
processing using pandas, NumPy, and Pydantic. Supabase will provide PostgreSQL,
Auth, and Storage with Row Level Security.

See [architecture decisions](docs/architecture.md) for the planned service diagram,
feature boundaries, and stage decisions. Zod and Supabase client dependencies are
now installed. ECharts and shared dashboard state remain deferred to their feature
stages. FastAPI, Pydantic, pandas, and NumPy power the validated CSV preview.

## Authentication and database setup

See [Supabase setup](docs/supabase-setup.md) for project creation, the profile
migration, email confirmation template, and the live verification checklist.

- `/login` and `/register` use validated Server Actions and cookie-based sessions.
- `/auth/confirm` verifies email tokens with Supabase and establishes a session.
- `/dashboard` and `/project/*` require authentication in Next.js Proxy.
- The protected layout and workspace independently revalidate users on the server.
- No service-role key or privileged application client is used.
- `public.profiles` permits each authenticated user to read only their own row;
  Auth triggers own all profile writes.

The workspace lists projects in pages of 12. `/dashboard/new` creates a project;
`/project/[id]` reopens saved details, and `/project/[id]/settings` supports renaming,
description editing, and confirmed deletion. All operations use the authenticated
Supabase client with explicit ownership filters and database RLS. No dataset or
statistics are fabricated for empty projects.

## shadcn/ui

Configuration is in `apps/web/components.json`, with theme tokens in
`apps/web/app/globals.css` and the `cn` utility in `apps/web/lib/utils.ts`.
The New York style is configured. Button, Card, Badge, Dialog, Sheet, Input, and Label are installed
and use the existing `cn` helper. Their source lives in `apps/web/components/ui`.

Add additional components from the web directory only as needed:

```sh
cd apps/web
pnpm dlx shadcn@4.21.0 add button
```

Review generated code and run the root checks before committing. Components remain
local to the web app until another application needs to share them.

If `pnpm dlx` on Windows reports `ERR_MODULE_NOT_FOUND` for a CLI dependency such
as `fs-extra`, a fresh, shorter cache with the global virtual store disabled worked
in the verified environment. From the repository root (PowerShell):

```powershell
$cliCache = Join-Path $env:USERPROFILE ".cache/narra-pnpm"
pnpm --config.cacheDir="$cliCache" --config.enableGlobalVirtualStore=false dlx shadcn@4.21.0 info --cwd apps/web
```

Use the same command with `add <component>` instead of `info` when adding a new
component. This changes only the CLI invocation, not global pnpm settings.

Setup references: [Next.js ESLint configuration](https://nextjs.org/docs/app/api-reference/config/eslint)
and [shadcn/ui installation](https://ui.shadcn.com/docs/installation/manual).

See the [Stage 1 verification record](docs/stage-1-verification.md) for executed
foundation checks and resolved setup issues, and the
[Stage 2 verification record](docs/stage-2-verification.md) for the landing page.
Stage 3 results and remaining live checks are in the
[authentication verification record](docs/stage-3-verification.md).
Project management results and hosted checks are in the
[Stage 4 verification record](docs/stage-4-verification.md).
FastAPI results are in the [Stage 5 verification record](docs/stage-5-verification.md).
CSV upload results are in the [Stage 6 verification record](docs/stage-6-verification.md).
Schema rules and checks are in the [Stage 7 verification record](docs/stage-7-verification.md).
Statistics rules and checks are in the [Stage 8 verification record](docs/stage-8-verification.md).
Dataset exploration checks are in the [Stage 9 verification record](docs/stage-9-verification.md).
Recommendation rules and checks are in the [Stage 10 verification record](docs/stage-10-verification.md).

## Roadmap

Work proceeds one stage at a time, with verification and a meaningful commit for
each stage. Stage 11 begins only after explicit instruction.

1. **Complete:** monorepo and frontend foundation.
2. **Complete:** branding, navbar, landing page, UI primitives, and responsive behavior.
3. **Implemented; live setup/verification pending:** Supabase auth, route protection, and profile RLS.
4. **Implemented; hosted verification pending:** project management, migrations, and ownership checks.
5. **Implemented:** FastAPI foundation, versioned health, CORS, and tests.
6. **Implemented; server configuration required for live uploads:** CSV upload, validation, and temporary preview.
7. **Implemented:** Schema inference, column metadata, and schema summary.
8. **Implemented:** Statistics and missing-value analysis.
9. **Implemented:** Dataset preview, statistics panel, and pagination.
10. **Implemented:** Deterministic visualization recommendations.
11. **Next:** ECharts dashboard and KPIs.
12. Deterministic insights, correlations, and outliers.
13. Synchronized dashboard filters.
14. Dataset storage and saved project restoration.
15. Sample datasets and demo flow.
16. Full automated tests, accessibility, and error-state verification.
17. Final documentation and deployment instructions.

The complete V1 workflow will cover registration, CSV analysis, generated charts,
filtering, saving, and reopening projects. Screenshots, live demo details, database
setup, and deployment procedures will be documented when those stages are built.
