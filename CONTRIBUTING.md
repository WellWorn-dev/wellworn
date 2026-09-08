# Contributing

## Verdicts and traps

The fastest route for a trap is `submit_trap` from your agent with a free key. For anything else, open a pull request:

1. One YAML file per verdict under `verdicts/<kind>/<slug>.yaml`, matching `spec/verdict.schema.json`. Run `pnpm validate:verdicts`.
2. Every claim needs a source URL and the date you read it. Version strings are what you actually tested.
3. A reviewer takes the pull request into the review queue; nothing merges automatically. Published verdicts get `verified_by`, `verified_at`, and `expires_at` from the reviewer.

## Skills

One folder per skill under `skills/<slug>/SKILL.md` in the open Agent Skills format. State the versions you verified against and the date.

## Server and packages

`pnpm install`, `pnpm typecheck`, `pnpm test` (tests need Postgres and Redis; see `packages/mcp/.env.example`). Keep changes small and additive; every behaviour change comes with a test.
