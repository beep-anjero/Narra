# Shared contracts

Reserved for TypeScript contracts and validation schemas shared by consumers.
Add an `@narra/shared` workspace package when those contracts are implemented.

The Python analytics service will own its Pydantic models. Decide how to synchronize
its API contracts with TypeScript during API integration, before duplicating models.
Stage 1 does not define speculative dataset or chart contracts.
