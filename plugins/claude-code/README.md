# Wellworn plugin for Claude Code

Adds the Wellworn MCP server, a skill that tells Claude when to ask it, and a hook that prints known traps whenever a dependency manifest is about to change. The hook is advisory: it never blocks an edit and never sends file contents.

## Install

```
claude plugin marketplace add WellWorn-dev/wellworn
claude plugin install wellworn
```

No account or key is needed. Sixty calls a day per IP; a free key raises that to 2,000 a month per organization: https://wellworn.dev/keys

## What it contains

- `.mcp.json`: the remote MCP endpoint `https://mcp.wellworn.dev/mcp`
- `skills/wellworn`: when and how Claude uses the tools
- `hooks/hooks.json` + `scripts/check-traps.sh`: PreToolUse hook on package install commands (npm, pnpm, yarn, bun, pip, uv, composer, cargo) and on edits to `package.json`, `pyproject.toml`, `composer.json`, `Cargo.toml`, `go.mod`, `Gemfile`, `requirements.txt`

## Other agents

Cursor, Codex, Gemini CLI, Windsurf, and any MCP client: https://wellworn.dev/docs
