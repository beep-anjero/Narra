# Narra

Turn raw datasets into understandable dashboards.

Narra is a planned full-stack application that examines uploaded CSV datasets and
recommends useful statistics, visualizations, and deterministic insights. The MVP
will use rules and calculations, with no AI/LLM functionality.

**Current status: Stage 2 landing page.** The monorepo, frontend tooling, branding,
responsive marketing page, and reusable UI primitives are implemented.
Authentication, projects, uploads, analytics, working dashboards, and persistence
remain future stages.

The landing page includes an explicitly labeled illustrative dashboard. **Try Demo
Data** links to that preview; **Analyze a Dataset** opens an availability dialog.
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
- shadcn Button, Card, Badge, Dialog, and Sheet primitives.
- Vitest and React Testing Library tests for dialog and navigation behavior.

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

Open [localhost:3000](http://localhost:3000). The current frontend requires no Supabase account,
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
| `pnpm test`         | Run component interaction tests                               |
| `pnpm test:watch`   | Run component tests in watch mode                             |
| `pnpm check`        | Check formatting, lint, types, tests, and production build    |

Run `pnpm test` for the Vitest/React Testing Library suite, or `pnpm test:watch`
during development. `pnpm check` also runs tests before the production build.
The initial four component tests cover availability messaging, focus trapping,
Escape dismissal, focus restoration, preview navigation, and mobile drawer closure.

These tests use jsdom; they do not verify browser layout or replace future
Playwright E2E tests. pytest and Playwright remain scheduled for later stages.

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

Local `.env` files are ignored by Git. No service-role key is needed for the current frontend.
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
The New York style is configured. Button, Card, Badge, Dialog, and Sheet are installed
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

## Roadmap

Work proceeds one stage at a time, with verification and a meaningful commit for
each stage. Stage 3 begins only after explicit instruction.

1. **Complete:** monorepo and frontend foundation.
2. **Complete:** branding, navbar, landing page, UI primitives, and responsive behavior.
3. **Next:** Supabase authentication, route protection, and RLS.
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
