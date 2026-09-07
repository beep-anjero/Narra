# Shared UI

Reserved for UI components that need to be shared between applications. In Stage 1,
shadcn/ui is configured in `apps/web/components.json`, and its components will live
in `apps/web/components/ui` when introduced in Stage 2.

This directory intentionally has no package manifest, exports, or build pipeline
until there is actual shared code. Add an `@narra/ui` workspace package when needed.
