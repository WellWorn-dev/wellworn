# wellworn

The judgment layer for coding agents, from the command line. No account needed for the first 60 calls a day per address.

```
npx wellworn traps better-auth 1.7.3
npx wellworn check                 # every dependency in package.json or requirements.txt
npx wellworn mcp                   # stdio bridge for clients that cannot reach a remote MCP server
```

`check` prints the verified traps for each dependency and exits 0 unless you pass `--strict`. Set `WELLWORN_API_KEY` to use a free key (2,000 calls a month per organization).

Docs: https://wellworn.dev/docs. Source: https://github.com/WellWorn-dev/wellworn (MIT).
