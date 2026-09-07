# Narra

Turn raw datasets into understandable dashboards.

Narra is a planned full-stack application that examines uploaded CSV datasets and
recommends useful statistics, visualizations, and deterministic insights. The MVP
will use rules and calculations, with no AI/LLM functionality.

**Current status: Stage 1 foundation.** The monorepo, frontend configuration, and
basic application shell are implemented. The marketing page, authentication,
projects, uploads, analytics, charts, and persistence are not implemented yet.

## Implemented foundation

- Next.js 16 App Router and React 19.
- Strict TypeScript with checked indexed access and `@/*` imports.
- Tailwind CSS v4, neutral theme tokens, and shadcn/ui configuration.
- Accessible base layout with page metadata, language, and a skip link.
- pnpm workspace scripts, exact dependency versions, and lockfile.
- ESLint with Next.js/TypeScript rules and Prettier formatting.
- Environment example, Git ignore rules, and reserved application directories.

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
│   └── analytics/           # Reserved; initialized in Stage 5
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
├── supabase/migrations/    # Reserved for schema and RLS
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

Open [localhost:3000](http://localhost:3000). Stage 1 requires no Supabase account,
Python installation, environment file, or other running service.

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
| `pnpm check`        | Check formatting, lint, types, then production build          |

No automated feature test suite is installed in Stage 1. pytest, Vitest, React
Testing Library, and Playwright will be introduced alongside the features they
verify. Build and HTTP smoke checks verify the initial shell.

## Environment variables

The root [`.env.example`](.env.example) is a template for later stages. All variables
are currently unused. When integrations are introduced, copy the web entries into
`apps/web/.env.local`; Next.js does not automatically read a root monorepo `.env`.

| Variable                               | Future consumer          | Purpose                                        |
| -------------------------------------- | ------------------------ | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Web                      | Supabase project URL                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Web                      | Public Supabase key, with RLS enforcing access |
| `ANALYTICS_API_URL`                    | Web server               | FastAPI base URL                               |
| `MAX_UPLOAD_SIZE_BYTES`                | Web server and analytics | Shared upload limit; default 20 MiB            |
| `MAX_DATASET_ROWS`                     | Analytics                | Maximum accepted row count                     |
| `CORS_ORIGINS`                         | Analytics                | Allowed web origins                            |

Local `.env` files are ignored by Git. No service-role key is needed for Stage 1.
Never place private credentials in variables prefixed with `NEXT_PUBLIC_`.

## Architecture and planned stack

The frontend will use Next.js, TypeScript, React, Tailwind CSS, shadcn/ui, Apache
ECharts, Zod, and Zustand when dashboard state needs it. FastAPI will handle data
processing using pandas, NumPy, and Pydantic. Supabase will provide PostgreSQL,
Auth, and Storage with Row Level Security.

See [architecture decisions](docs/architecture.md) for the planned service diagram,
feature boundaries, and Stage 1 decisions. ECharts, state management, validation,
Supabase, and Python dependencies are intentionally deferred to their feature stages.

## shadcn/ui

Configuration is in `apps/web/components.json`, with theme tokens in
`apps/web/app/globals.css` and the `cn` utility in `apps/web/lib/utils.ts`.
The New York style is configured; no component catalog is generated yet.

In Stage 2, add individual components from the web directory as needed:

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

Use the same command with `add button` instead of `info` when adding that component
in Stage 2. This changes only the CLI invocation, not global pnpm settings.

Setup references: [Next.js ESLint configuration](https://nextjs.org/docs/app/api-reference/config/eslint)
and [shadcn/ui installation](https://ui.shadcn.com/docs/installation/manual).

See the [Stage 1 verification record](docs/stage-1-verification.md) for executed
checks and resolved setup issues.

## Roadmap

Work proceeds one stage at a time, with verification and a meaningful commit for
each stage. Stage 2 begins only after explicit instruction.

1. **Complete:** monorepo and frontend foundation.
2. **Next:** branding, navbar, landing page, UI primitives, and responsive behavior.
3. Supabase authentication, route protection, and RLS.
4. Project management, migrations, and ownership checks.
5. FastAPI foundation and tests.
6. CSV upload and validation.
7. Schema inference.
8. Statistics and missing-value analysis.
9. Dataset preview.
10. Deterministic visualization recommendations.
11. ECharts dashboard and KPIs.
12. Deterministic insights, correlations, and outliers.
13. Synchronized dashboard filters.
14. Dataset storage and saved project restoration.
15. Sample datasets and demo flow.
16. Full automated tests, accessibility, and error-state verification.
17. Final documentation and deployment instructions.

The complete V1 workflow will cover registration, CSV analysis, generated charts,
filtering, saving, and reopening projects. Screenshots, live demo details, database
setup, and deployment procedures will be documented when those stages are built.
