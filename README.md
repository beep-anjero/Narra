# Narra

Turn raw datasets into understandable dashboards.

Narra is a planned full-stack application that examines uploaded CSV datasets and
recommends useful statistics, visualizations, and deterministic insights. The MVP
will use rules and calculations, with no AI/LLM functionality.

**Current status: Stage 4 project management implementation.** The monorepo, landing
page, email/password auth, and owner-protected project creation, listing, editing,
and deletion are implemented. Apply both migrations using [Supabase setup](docs/supabase-setup.md).
Hosted database and browser verification remain pending. Uploads, analytics, charts,
and dataset persistence remain future stages.

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
Python is not needed yet.

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
pytest and Playwright remain scheduled for later stages.

## Environment variables

The root [`.env.example`](.env.example) documents current and future integrations.
Stage 3 consumes the two public Supabase variables. Copy those entries into
`apps/web/.env.local`; Next.js does not automatically read a root monorepo `.env`.

| Variable                               | Consumer                 | Purpose                                        |
| -------------------------------------- | ------------------------ | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Web                      | Supabase project URL                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Web                      | Public Supabase key, with RLS enforcing access |
| `ANALYTICS_API_URL`                    | Future web server        | FastAPI base URL; unused yet                   |
| `MAX_UPLOAD_SIZE_BYTES`                | Future web and analytics | Upload limit; default 20 MiB; unused yet       |
| `MAX_DATASET_ROWS`                     | Future analytics         | Row count limit; unused yet                    |
| `CORS_ORIGINS`                         | Future analytics         | Allowed web origins; unused yet                |

Local `.env` files are ignored by Git. No service-role key is needed for the current frontend.
Never place private credentials in variables prefixed with `NEXT_PUBLIC_`.

## Architecture and planned stack

The frontend will use Next.js, TypeScript, React, Tailwind CSS, shadcn/ui, Apache
ECharts, Zod, and Zustand when dashboard state needs it. FastAPI will handle data
processing using pandas, NumPy, and Pydantic. Supabase will provide PostgreSQL,
Auth, and Storage with Row Level Security.

See [architecture decisions](docs/architecture.md) for the planned service diagram,
feature boundaries, and stage decisions. Zod and Supabase client dependencies are
now installed. ECharts, shared dashboard state, and Python dependencies remain
deferred to their feature stages.

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

## Roadmap

Work proceeds one stage at a time, with verification and a meaningful commit for
each stage. Stage 5 begins only after explicit instruction.

1. **Complete:** monorepo and frontend foundation.
2. **Complete:** branding, navbar, landing page, UI primitives, and responsive behavior.
3. **Implemented; live setup/verification pending:** Supabase auth, route protection, and profile RLS.
4. **Implemented; hosted verification pending:** project management, migrations, and ownership checks.
5. **Next:** FastAPI foundation and tests.
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
