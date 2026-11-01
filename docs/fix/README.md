# Active fixes

Index of in-progress and pending fixes. Merged fixes are removed from this table —
history lives in git log + closed issues.

## Status legend

- `pending` — SPEC drafted, branch not yet open
- `in-progress` — branch open, work ongoing
- `in-review` — PR open, awaiting merge

## Active

| Folder | Topic | Status | Depends on | Issue |
|--------|-------|--------|------------|-------|
| `audit-2-batch` | Restore lying process artifacts (fix index, capabilities, roadmap) + drop 4 stray deps + rate-limit the account routes | `in-review` | — | [#81](https://github.com/gtrabanco/bingo-ev/issues/81), [#82](https://github.com/gtrabanco/bingo-ev/issues/82), [#84](https://github.com/gtrabanco/bingo-ev/issues/84), [#85](https://github.com/gtrabanco/bingo-ev/issues/85), [#90](https://github.com/gtrabanco/bingo-ev/issues/90) |

## Conventions

- One folder per fix: `docs/fix/<issue-number>-<topic>/SPEC.md`.
- Every fix has a tracked issue; the PR closes it.
- Remove the row when the PR merges.
