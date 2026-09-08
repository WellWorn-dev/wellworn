# Wellworn verdicts

The public corpus behind https://wellworn.dev and the Wellworn MCP. One YAML file per verdict, validated against [`spec/verdict.schema.json`](../spec/verdict.schema.json). Folders are the verdict kinds: `recommend`, `compare`, `alternatives`, `design`, `stack`.

Files here are mirrored from the review database after a reviewer publishes them. A file in this repository without `verified_at` in its frontmatter is a draft awaiting review and is not served.

## Contribute

- Open a pull request with a new file or a correction. CI validates the schema and a reviewer takes it into the queue; nothing merges automatically.
- Every claim needs a source URL and the date you read it. Version strings are what you actually tested.
- Hit a breakage? The fastest route is `submit_trap` from inside your agent with a free key.

## License

Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0). Use the verdicts anywhere, credit Wellworn, and share improvements under the same license.
