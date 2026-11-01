# audit-2-batch — review findings

Fold ledger for the audit-2 batch. Rows are seeded from
`docs/audits/2-2026-11-01.md` (`↳ triaged` notes name the issue each row became);
`fold-findings` is the sole writer of the `folded` flip.

| id | file:line | axis | severity | class | route | folded |
|---|---|---|---|---|---|---|
| F2 | `docs/fix/README.md:1` | process | high | fix-now | fold in batch — issue #81 | yes |
| F3 | `docs/CAPABILITIES.md:37` | process | high | fix-now | fold in batch — issue #82 | yes |
| F4 | `src/pages/api/account/index.ts:45` | security | med | fix-now | fold in batch — issue #90 | yes |
| F6 | `package.json:21` | security | med | fix-now | fold in batch — issue #84 | yes |
| F8 | `docs/features/ROADMAP.md:22` | roadmap | low | fix-now | fold in batch — issue #85 | yes |

## Progress log

- **2026-11-01 — fold F2 + F3 + F4 + F6 + F8** (`fix/audit-2-batch`): restored
  the four lying artifacts and added the missing rate-limit guard. Swept surfaces:
  the fix index (17 stale rows deleted, batch row registered), `CAPABILITIES.md`
  auth + ACL rows and the Roles table, both account routes, the roadmap status
  column for rows 06/07, and `REPOSITORY_STATE.md` OQ-001/RF-010.

swept: /No accounts or auth/ → expected 3 in docs/**
swept: /\| Authentication \| no/ → expected 0 in docs/**
swept: /^\| 0[67] .*\| planned \|/ → expected 0 in docs/features/ROADMAP.md
