# Stage 1 verification

Verified on September 7, 2026, on Windows with Node.js 24.11.0 and pnpm 11.19.0.

## Repository inspection

The working directory was empty. No existing Git repository or ancestor `AGENTS.md`
instructions were found. Initialized a new local Git repository on `main`.

## Commands and outcomes

| Command/check                                                     | Result                                                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install`                                                    | Downloaded dependencies; initial dependency-build policy failure resolved below                                          |
| `pnpm install --frozen-lockfile`                                  | Passed after configuration correction                                                                                    |
| `pnpm format`                                                     | Passed; applied consistent formatting                                                                                    |
| `pnpm check`                                                      | Passed all four checks below                                                                                             |
| `pnpm format:check`                                               | Passed                                                                                                                   |
| `pnpm lint`                                                       | Passed with zero errors and zero warnings                                                                                |
| `pnpm typecheck`                                                  | Passed route type generation and `tsc --noEmit`                                                                          |
| `pnpm build`                                                      | Passed Next.js 16.3.4 production compilation and static generation                                                       |
| `pnpm --filter @narra/web start --hostname 127.0.0.1 --port 3100` | Production server started successfully                                                                                   |
| PowerShell HTTP smoke checks                                      | Home returned 200; language, skip link, and text present; compiled Tailwind CSS returned 200; unknown route returned 404 |
| shadcn 4.21.0 `info --cwd apps/web` using fresh CLI cache         | Passed; recognized App Router, RSC, TypeScript, Tailwind v4, style, and all aliases                                      |
| `git check-ignore`                                                | Local environment files, dependencies, and `.next` ignored; `.env.example` available for tracking                        |

The production server was stopped after the HTTP checks. No feature test suite or
browser E2E suite exists yet; those remain scheduled for their feature stages.

## Resolved setup issues and limitations

- The first install used the older `onlyBuiltDependencies` setting. pnpm 11 uses
  `allowBuilds`; the workspace now explicitly permits the required native tooling.
  Engine and exact-version settings also live in `pnpm-workspace.yaml`.
  The frozen-lockfile install then completed successfully. See the
  [pnpm 11 release notes](https://github.com/pnpm/pnpm.io/blob/main/blog/releases/11.0.md).
- The initial HTTP check looked for a CSS token alias that Tailwind inlines during
  compilation. The corrected check verifies the emitted theme variable and actual
  typography utility. No application change was needed.
- Default `pnpm dlx` execution failed to resolve `fs-extra` from its temporary
  dependency tree. A fresh, shorter cache and disabled global virtual store for
  that invocation passed. The exact reusable workaround is in the README.
- The package registry reports ESLint 9 as deprecated. It is retained to satisfy
  the supported peer range of Next.js's React lint plugin. This is a dependency
  lifecycle notice; the actual lint run has no warnings. See the architecture
  decision before upgrading the lint major version.

## Scope boundary

This stage includes only the repository and frontend foundation. It does not
implement marketing sections, auth, projects, analytics endpoints, CSV handling,
charts, persistence, or V2 features. Stage 2 requires explicit instruction.
