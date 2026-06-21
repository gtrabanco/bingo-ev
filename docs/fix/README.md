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
| `31-owner-handle-bypass` | Owner OAuth account should bypass handle blocklist | `in-review` | — | [#31](https://github.com/gtrabanco/bingo-ev/issues/31) |
| `33-remove-integration-package` | Remove integration/ reference package after feature 14 merge | `in-review` | — | [#33](https://github.com/gtrabanco/bingo-ev/issues/33) |
| `39-blocklist-reserved-handles` | Expand reserved blocklist — owner variants, site terms, EV brands | `in-review` | — | [#39](https://github.com/gtrabanco/bingo-ev/issues/39) |
| `41-vincular-bidirectional` | Vincular always visible — bidirectional device transfer | `in-review` | — | [#41](https://github.com/gtrabanco/bingo-ev/issues/41) |
| `43-sitenav-login-alignment` | Login buttons misaligned — nav-box vs nav-action mismatch | `in-review` | — | [#43](https://github.com/gtrabanco/bingo-ev/issues/43) |

## Conventions

- One folder per fix: `docs/fix/<issue-number>-<topic>/SPEC.md`.
- Every fix has a tracked issue; the PR closes it.
- Remove the row when the PR merges.
