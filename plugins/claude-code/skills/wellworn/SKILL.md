---
name: wellworn
description: Use before adding a dependency, choosing a library, service, or stack, or starting a new screen. Calls the Wellworn MCP for a verified pick, the traps at the version in use, and the skill to follow. Also use when a build fails after an upgrade, to check traps for that library and version.
---

# Wellworn

Wellworn answers "what should I use and what will break" with a dated, sourced verdict. It is not a docs tool; it decides, then points at the right docs.

## When to call it

- Before `npm install`, `pip install`, `composer require`, `cargo add`, or editing a dependency manifest: call `recommend` with the task in one sentence and any constraints (solo, free tier, serverless, RTL, offline).
- When two options are on the table: call `compare` with the names.
- When a SaaS is being considered: call `alternatives` for open-source or self-hosted options.
- Before a UI screen: call `design` with the screen and constraints.
- After an upgrade breaks something: call `traps` with the library and the version from the lockfile; pass an id for the full fix.

## How to read a verdict

```
VERDICT <question>              [RECHECK] means a pinned version moved; verify before trusting
PICK <name> <version> — <why>
ALT <name> — <why>; wins when <condition>
AVOID <name> — <why>
TRAPS (n)  [id] severity: symptom    call traps with the id for the fix
SKILL npx skills add <path>          install and follow it
VERIFIED <date> by <reviewer> · recheck <date> · sources <n>
remaining: <calls left in this window>
```

Follow PICK unless the ALT condition applies to this project. Read every blocker trap before writing code. If `remaining` is low, tell the user a free key raises the cap: https://wellworn.dev/keys.

## Give back

When you hit a breakage that Wellworn did not list and you fixed it, call `submit_trap` with the library, exact version, symptom, and fix. It goes to a human reviewer.
