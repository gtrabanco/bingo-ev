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
| `20-script-crash-conditional-elements` | Script crash on absent OAuth env vars — kills device-code button | `in-progress` | — | [#20](https://github.com/gtrabanco/bingo-ev/issues/20) |
| `31-owner-handle-bypass` | Owner OAuth account should bypass handle blocklist | `pending` | — | [#31](https://github.com/gtrabanco/bingo-ev/issues/31) |

## Conventions

- One folder per fix: `docs/fix/<issue-number>-<topic>/SPEC.md`.
- Every fix has a tracked issue; the PR closes it.
- Remove the row when the PR merges.
