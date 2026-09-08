# @wellworn/mcp

The Wellworn MCP server: `recommend`, `compare`, `alternatives`, `traps`, `skill`, `design`, `docs`, and `submit_trap` over Streamable HTTP, plus the plain-text `GET /api/traps` endpoint.

Most people do not need to run it. The hosted endpoint is `https://mcp.wellworn.dev/mcp`, free without a key. Run your own copy when you want the server on your network:

```
DATABASE_URL=postgres://user:pass@host:5432/wellworn REDIS_URL=redis://host:6379 npx @wellworn/mcp
```

It needs Postgres 17 and Redis 7, runs migrations on start, and listens on `PORT` (default 3001). Set `TRUST_PROXY=1` only behind a proxy you control. The corpus is the `verdicts/` folder of https://github.com/WellWorn-dev/wellworn; loading it is described at https://wellworn.dev/docs/security/self-hosting.

MIT. Verdicts are CC BY-SA 4.0.
