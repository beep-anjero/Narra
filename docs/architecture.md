# Architecture

## Status

Stages 1–2 establish a runnable Next.js frontend, marketing page, and repository conventions. Only
`apps/web` is executable. The remaining directories reserve the requested structure;
no authentication, analytics, storage, or database functionality is implemented yet.

## Planned service boundaries

```mermaid
flowchart LR
    Browser[Browser] --> Web[Next.js App Router]
    Web --> Auth[Supabase Auth]
    Web --> Database[(PostgreSQL with RLS)]
    Web --> Storage[Supabase Storage]
    Web --> API[FastAPI /api/v1]
    API --> Processing[pandas + NumPy services]
```

Next.js will own the UI and server-side integration/persistence layer. FastAPI will
own deterministic analytics with no direct persistence. Supabase will supply
identity, relational storage, and private CSV storage. Server-side ownership checks
and RLS will enforce user isolation when these integrations are implemented.

## Foundation decisions

- Use pnpm workspaces with exact direct dependencies and a committed lockfile.
  Root scripts delegate to the web workspace. A task orchestrator is unnecessary
  for the current single executable application.
- Standardize development on Node.js 24 and pin pnpm to 11.19.0. `.node-version`
  records the verified local Node version.
- Use the Next.js App Router with server components by default. Add client
  components only for interactions when features need them.
- Enable TypeScript strict mode and checked indexed access. Keep the `@/*` alias
  scoped to `apps/web`, so feature imports remain straightforward.
- Configure Tailwind CSS v4 through PostCSS and shared CSS theme tokens. Stage 2
  uses a forest-green palette and a locally bundled Geist variable font, avoiding
  external font requests at build time and runtime.
- Configure shadcn/ui with the New York style, React Server Components support,
  local component aliases, and a `cn` helper. Stage 2 adds only Button, Card, Badge,
  Dialog, and Sheet, with their required dependencies.
- Keep shared-package directories reserved until code has a real second consumer.
  No empty JavaScript packages or duplicate UI implementations are needed now.
- Run ESLint separately from `next build`, with Next.js Core Web Vitals and
  TypeScript rules. Prettier owns formatting. Warnings fail the lint command.
  ESLint 9 is pinned because the React lint plugin used by Next.js currently
  declares support through ESLint 9. The registry marks that major deprecated;
  upgrade once the plugin supports ESLint 10 rather than override peer constraints.
- Environment variables in `.env.example` document future integration boundaries.
  No variable is required or consumed in Stage 1. Next.js local configuration will
  live in `apps/web/.env.local`; private keys must never use `NEXT_PUBLIC_`.

## Frontend organization

| Directory    | Responsibility                                       |
| ------------ | ---------------------------------------------------- |
| `app`        | Routes, root layout, metadata, and global styles     |
| `components` | Reusable UI; shadcn components under `components/ui` |
| `features`   | Feature-specific components, hooks, and logic        |
| `hooks`      | Hooks reused across features                         |
| `lib/api`    | Future centralized server/API integration            |
| `lib`        | Cross-feature utilities                              |
| `stores`     | Future shared dashboard state when needed            |
| `types`      | Application-wide TypeScript types                    |
| `tests`      | Future component, integration, and E2E tests         |

## Verification strategy

Run `pnpm check` for formatting, lint, TypeScript, component tests, and a production
build. Stage 2 introduces Vitest/React Testing Library with jsdom for dialog and
mobile navigation interactions. pytest and Playwright remain later-stage work.
Component tests do not claim browser layout or end-to-end verification.

## Stage 2 boundaries

- Marketing components live in `features/marketing`. The page composes sections;
  UI primitives and the reusable brand remain in `components`.
- Only the header/drawer and availability dialogs need client behavior. Marketing
  copy and the dashboard illustration render on the server.
- Preview values live in a small, explicitly illustrative fixture. The SVG and
  category bars depict those values without introducing ECharts or an analytics
  implementation before their stages. An accessible table exposes exact monthly
  values; the chart scrolls within its card on small screens to keep labels legible.
- Every navigation link targets a real section. The primary CTA explains current
  availability in a dialog; the demo CTA points to the labeled static preview.
  Auth, upload, data filtering, persistence, and an interactive demo remain deferred.
- The theme uses restrained surfaces, responsive grids, visible focus styles,
  reduced-motion support, and accessible Radix dialog/drawer behavior.
- The Next.js development server generates local `AGENTS.md` and `CLAUDE.md` files.
  They are retained as generated guidance, as requested by their own instructions.
- Deployment is outside the user's stage-by-stage scope. No hosting project,
  static-export conversion, or infrastructure change is introduced in Stage 2.

## Next stage

Stage 3: Supabase configuration, registration, login, logout, protected routes,
and Row Level Security. Start only after explicit instruction.
