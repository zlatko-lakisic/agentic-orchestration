# Pull request review checklist

Use this when reviewing a PR, diff, or proposed merge. Focus on **actionable** feedback; cite files or behaviors when possible.

## Scope and intent

1. Does the change match the stated goal? Flag unrelated drive-by edits.
2. Is the diff size reasonable? Suggest splitting if multiple independent concerns are mixed.

## Correctness and regressions

3. Logic errors, off-by-one, missing error paths, race conditions.
4. Breaking changes to workflow YAML, CLI flags, env vars, or StepSpec JSON — call out migration notes.
5. Backward compatibility: legacy keys (`providers` vs `agent_providers`) preserved where documented.

## Tests and CI

6. Are there tests for new behavior? Do existing tests cover edge cases?
7. Would CI pass? Note missing fixtures, flaky patterns, or crewai-dependent tests without markers.

## Security and secrets

8. No committed `.env`, API keys, tokens, or credentials in logs.
9. New MCP/skills paths: credential gating and `required_files` respected; no arbitrary path traversal.

## Docs and operability

10. User-visible changes reflected in README, wiki, `.env.example`, or CLI help when relevant.
11. Release-impacting changes noted for `CHANGELOG.md` `[Unreleased]`.

## Output format

Structure the review as:

- **Summary** (1–2 sentences)
- **Blockers** (must fix before merge)
- **Suggestions** (nice to have)
- **Questions** (if intent is unclear)

If `gh` or CI output is available via tools, reference concrete check names or command results; otherwise state assumptions.
