# Roadmap

The single source of truth for feature **numbering, ordering, and dependencies**.
Every feature folder under `docs/features/<NN>-<slug>/` must have a row here, and
every row must have a folder (or be `planned` with no folder yet).

> The shipped game (cartón, dual marks, honorific certificate, groups with
> ownership/leave/kick/delete, email recovery, verification registry, GDPR page)
> predates this workflow and is **not** tracked as numbered features — it's the
> baseline. New work starts at `01`. Out-of-scope items below are lifted from
> `README.md`.

## Features

| NN | Slug | Status | Depends on | Summary |
|----|------|--------|------------|---------|
| 01 | `final-certificate-design` | in-progress | — | Final diploma design across both renderers (PNG + OG, P1–P3 done). **Scope expanded 2026-06-15** (owner decision, bundled): + Feature A diploma lifecycle/integrity (unmark invalidation/lock, 12-month retention) + Feature B abuse prevention (Turnstile + rate-limit). SPEC: `01-final-certificate-design/` |
| 02 | `photo-upload-collage` | planned | — | Let players attach/collage photos of real charger misery |
| 03 | `public-gallery` | planned | 01 | Public, shareable gallery of certificates |
| 04 | `analytics` | planned | — | Privacy-respecting analytics (no ad/analytics cookies) |
| 05 | `accounts` | planned | — | Optional accounts layered on the id+secret identity model |

## Status legend

- `planned` — in the roadmap, not started
- `in-progress` — branch open, phases executing
- `done` — merged

## Conventions

- Numbers are assigned in order and never reused.
- A feature that depends on another cannot start until its dependency is merged.
- Keep this table consistent with the feature folders (the `audit-docs` skill
  checks for drift).
