# Workflow migration history

Dated, additive notes for blocks the current template carries that this
project's substrate gained in a later upgrade — *why* the block exists and
*what* it migrates. Read this before a fresh `init-workspace` upgrade diff so
already-migrated blocks are not proposed again.

## 2026-08-20 — guard pack parity, five-state roadmap, invariants

Upgrade run (`init-workspace`, upgrade mode) against the July 2026 template.
All changes were additive; nothing existing was rewritten or deleted.

| Block | What changed | Why it exists | Status |
|---|---|---|---|
| `guard-command.sh` | Added bare-`export` / `export -p` block ("environment export listing") | Old guard allowed `export`/`export -p`, which list every exported variable (secret disclosure) | migrated |
| `adapters/pre-tool-guard.sh` | Replaced exit-0-always old adapter with the canonical **exec** adapter (invalid payload → stderr + exit 2; valid → `exec guard-command.sh`, propagating block exit code) | The Claude/Cursor adapter contract is exit-code blocking; the old version never propagated blocks, so `test-command-guard.sh` failed on every adapter case | migrated |
| `adapters/copilot-guard.sh` | Added (was absent) | Completes the guard pack; `test-command-guard.sh` referenced the file it shipped with | migrated |
| `.cursor/hooks.json.example`, `.github/hooks/agentic-workflow.json.example`, `.opencode/plugins/agentic-workflow-guard.ts.example` | Added (inactive examples) | Template inventory parity for the portable command-guard pack; activation still requires an explicit yes | migrated |
| `.claude/settings.json` | Added `PreToolUse` block running `pre-tool-guard.sh` (owner-accepted) | Activates the Claude Code safety adapter; existing `PostToolUse` migrate-on-commit untouched | migrated |
| `urgent` / `fix-next` labels | Seeded via `gh label create` (owner-accepted), additive-only | The two capability-gated labels `triage-issue` owns and applies; a pre-existing label was to be left untouched (none existed) | migrated |
| `docs/architecture/ARCHITECTURAL_INVARIANTS.md` | Filled AI-001…AI-007 from the project's own *declared* rules (CLAUDE.md names them invariant/canonical/hard) | Turned the empty template into a functional contract; no rule was inferred from implementation | migrated |
| `docs/features/ROADMAP.md` Status legend | Adopted the current five-state machine (`idea → defined → planned → in-progress → done`) and documented the project's parked `deferred`/`cancelled` states | Old legend predated `idea`/`defined`; the state machine is the single ground truth for sensors/planners | migrated |
| `CLAUDE.md` | Added `Git workflow: branches`, `Agent safety hooks` line, `Honesty to the user` hard rule, `Testing philosophy` + `Naming conventions` sections, `MIGRATION.md` doc-map row | The current template carries these workflow-convention lines the scaffold lacked | migrated |

**Residual / legacy:** 1) roadmap rows written before this run still read plain
`planned`-with-a-SPEC; they are treated as `defined`+`planned` without a
redirect (no change needed). 2) `test-init-workspace-contract.sh` (kept, per
template) and `test-opencode-guard.sh` (not copied) are **skills-repo CI
tests** — they compute `repo_root` expecting the `gtrabanco/agentic-workflow`
template tree, so they are not project-runnable by design; the project suite is
`test-command-guard.sh` + `test-fullauto-merge.sh` (both green). 3)
`docs/workflow/REPOSITORY_STATE.md` DOC-010 cites the invariants doc as "empty
template" — refresh it with `discover-repository-state` next, since only the
resolver rewrites frozen facts.