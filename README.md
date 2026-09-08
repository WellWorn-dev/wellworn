<p align="center">
  <a href="https://wellworn.dev"><img src="https://cdn.wellworn.dev/brand/mark-1024-transparent.png" width="72" alt="Wellworn"></a>
</p>

<h1 align="center">Wellworn</h1>

<p align="center">The judgment layer for coding agents: verified picks, traps at your version, skills, and design systems, over MCP.</p>

<p align="center">
  <a href="https://github.com/WellWorn-dev/wellworn/actions/workflows/ci.yml"><img src="https://github.com/WellWorn-dev/wellworn/actions/workflows/ci.yml/badge.svg" alt="ci"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0088f8" alt="MIT"></a>
  <a href="https://mcp.wellworn.dev/health"><img src="https://img.shields.io/badge/mcp-mcp.wellworn.dev-0088f8" alt="MCP endpoint"></a>
  <a href="https://wellworn.dev/docs"><img src="https://img.shields.io/badge/docs-wellworn.dev-0a0d12" alt="docs"></a>
  <a href="https://github.com/WellWorn-dev/wellworn/stargazers"><img src="https://img.shields.io/github/stars/WellWorn-dev/wellworn?style=flat&color=0088f8" alt="stars"></a>
</p>

Wellworn tells your agent which stack, library, skill, or design system to use, what breaks at the version in your lockfile, and who verified it, in under 800 tokens. It works without an account or key.

## Without Wellworn

Your agent picks from training data. It reaches for the library it saw most in 2024, a version that no longer exists, or a package that was deprecated last spring. Sonatype measured 27.76% of AI dependency upgrade suggestions pointing to non-existent, deprecated, or unsafe versions.

## With Wellworn

Before it adds a dependency or lays out a screen, the agent calls `recommend`, `compare`, `alternatives`, `traps`, `design`, or `docs` and gets a verdict:

```
VERDICT auth for a Next.js app, solo dev, free tier
PICK Better Auth 1.7: own your users table; org and api-key plugins; no per-MAU bill
ALT Clerk: hosted UI and SSO in a week; wins when you accept per-MAU pricing
AVOID NextAuth: v5 migration stalled since 2025; session callback traps
TRAPS (2)
  [a1f4c0d2] major: role changes wait for the 5 min cookie cache
  [c9e3b7a1] minor: Drizzle adapter needs the schema passed explicitly
SKILL npx skills add WellWorn-dev/wellworn/skills/better-auth-nextjs
VERIFIED 2026-09-05 by youcef · recheck 2026-12-04 · sources 3
remaining: 59
```

Every verdict names a reviewer, a date, the version tested, and an expiry. A nightly job re-reads the registries; when a major version moves, the verdict is served with a `[RECHECK]` flag instead of going stale.

## Works with

Any client that speaks Streamable HTTP takes the same URL: `https://mcp.wellworn.dev/mcp`. No key: 60 calls a day per IP. Free key: 2,000 a month per organization, sent as `Authorization: Bearer ww_...`. Clients that only speak stdio bridge with `npx mcp-remote https://mcp.wellworn.dev/mcp`.

| | Client | Setup | Guide |
|:--|:--|:--|:--|
| <img src=".github/assets/clients/claude-code.svg" width="18" alt=""> | Claude Code | `claude mcp add --transport http wellworn https://mcp.wellworn.dev/mcp` | [docs](https://wellworn.dev/docs/claude-code) |
| <img src=".github/assets/clients/cursor.svg" width="18" alt=""> | Cursor | `.cursor/mcp.json` | [docs](https://wellworn.dev/docs/cursor) |
| <img src=".github/assets/clients/vscode-copilot.svg" width="18" alt=""> | VS Code (Copilot) | `.vscode/mcp.json` | [docs](https://wellworn.dev/docs/vscode-copilot) |
| <img src=".github/assets/clients/windsurf.svg" width="18" alt=""> | Windsurf | `~/.codeium/windsurf/mcp_config.json` | [docs](https://wellworn.dev/docs/windsurf) |
| <img src=".github/assets/clients/codex-cli.svg" width="18" alt=""> | Codex CLI | `codex mcp add wellworn --url https://mcp.wellworn.dev/mcp` | [docs](https://wellworn.dev/docs/codex-cli) |
| <img src=".github/assets/clients/gemini-cli.svg" width="18" alt=""> | Gemini CLI | `~/.gemini/settings.json` | [docs](https://wellworn.dev/docs/gemini-cli) |
| <img src=".github/assets/clients/cline.svg" width="18" alt=""> | Cline | `cline_mcp_settings.json` | [docs](https://wellworn.dev/docs/cline) |
| <img src=".github/assets/clients/zed.svg" width="18" alt=""> | Zed | `settings.json` | [docs](https://wellworn.dev/docs/zed) |
| <img src=".github/assets/clients/opencode.svg" width="18" alt=""> | opencode | `opencode.json` | [docs](https://wellworn.dev/docs/opencode) |

### Claude Code plugin

The plugin adds the server, a skill that tells Claude when to ask it, and a hook that prints known traps whenever a dependency manifest is about to change. The hook is advisory; it never blocks an edit and never sends file contents.

```
claude plugin marketplace add WellWorn-dev/wellworn
claude plugin install wellworn
```

### Cursor

```json title=".cursor/mcp.json"
{ "mcpServers": { "wellworn": { "url": "https://mcp.wellworn.dev/mcp" } } }
```

### Gemini CLI

```json title="~/.gemini/settings.json"
{ "mcpServers": { "wellworn": { "httpUrl": "https://mcp.wellworn.dev/mcp" } } }
```

## Tools

| Tool | Returns |
|---|---|
| `recommend` | pick, alternative and when it wins, avoid, traps, skill, provenance |
| `compare` | the same block for 2 to 4 named options |
| `alternatives` | open-source or self-hosted alternatives to a SaaS or library |
| `traps` | known breakages for a library at a version; pass `id` for the full fix |
| `skill` | the SKILL.md procedure or its install command |
| `design` | design system, tokens, layout rules, anti-patterns for a screen |
| `docs` | official docs URL, llms.txt, latest version |
| `submit_trap` | report a breakage and its fix to a reviewer (needs a free key) |

Plain text without MCP: `curl "https://mcp.wellworn.dev/api/traps?library=better-auth&version=1.7.3"`.

## What is in this repository

| Path | What | License |
|---|---|---|
| `packages/mcp` | the MCP server (TypeScript, `@modelcontextprotocol/sdk` 1.x, Express, Postgres, Redis) | MIT |
| `packages/db`, `packages/verdict`, `packages/ratelimit` | schema and queries, the compact renderer with its size contract, the Redis limiter | MIT |
| `plugins/claude-code` | the Claude Code plugin (MCP config, skill, PreToolUse hook) | MIT |
| `skills/` | installable skills in the Agent Skills format: `npx skills add WellWorn-dev/wellworn` | MIT |
| `spec/` | the verdict format, JSON Schema | CC0 |
| `verdicts/` | the public corpus, one YAML per verdict, mirrored from the review database | CC BY-SA 4.0 |
| `server.json` | manifest for the MCP registry | |

The web platform, the review tooling, and the signal pipeline that keeps verdicts fresh run at https://wellworn.dev and are not part of this repository.

## Running the server yourself

```
pnpm install
cp packages/mcp/.env.example packages/mcp/.env   # DATABASE_URL, REDIS_URL
DATABASE_URL=... pnpm --filter @wellworn/db migrate
pnpm --filter @wellworn/mcp dev
```

Tests: `pnpm test` (Postgres and Redis required).

## Contributing

Contributions are welcome: verdicts, traps, skills, client setup pages, and server fixes. Start with an issue template (verdict, trap, bug) or a pull request; see `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`. Traps are fastest through `submit_trap`; verdicts and corrections arrive as pull requests against `verdicts/` and go through a human reviewer.

## License

MIT for the code. Corpus CC BY-SA 4.0. Spec CC0.
