# Wellworn verdict spec

A verdict is the unit of judgment Wellworn serves to agents: one question, one pick, one alternative and the condition under which it wins, what to avoid, the traps at a version, the skill, and provenance.

`verdict.schema.json` is the JSON Schema (draft 2020-12) for the YAML files in the [verdicts](https://github.com/WellWorn-dev/verdicts) repository. Rules the schema cannot express, enforced on publish:

1. Exactly one node has role `pick`.
2. `verified_by`, `verified_at`, and `version_tested` are set by the reviewer who publishes, not by the author.
3. `expires_at` is at most 120 days after `verified_at`. A verdict served after that date carries a RECHECK flag.
4. Every claim in `answer_md`, `alt_md`, and `avoid_md` is covered by a source with the date it was read.
5. Trap `version_range` is a semver range against the node's package version, or `*`.

Public domain (CC0 1.0). Use it for your own verdict corpus; interoperable corpora are the point.
