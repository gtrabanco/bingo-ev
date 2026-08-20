# fix/78-dependency-upgrade

> Upgrade all npm dependencies to their latest patch/minor versions. All current
> dependencies are on patch-level releases; upgrades are all patch or minor with
> no breaking changes expected.

## Goal

Update astro, @astrojs/cloudflare, tailwindcss, @tailwindcss/vite, and wrangler
to their latest published versions to stay current with upstream fixes and
improvements. No functional changes to the application code.

## Issue

`#78`

## Branch

`fix/78-dependency-upgrade`

## Root cause

Dependencies have not been updated since initial project setup. Stale dependencies
can miss security patches, performance improvements, and bug fixes.

## Scope

### In scope

- `package.json` version bumps
- Regenerate `package-lock.json` via `npm install`
- `npm run build` verification gate

### Out of scope

- Any code changes
- Any migration or config changes
- `node_modules` cleanup

## Impact

- Files touched: `package.json`, `package-lock.json`
- Blast radius: only the build toolchain; runtime code is untouched
- Detection: `npm run build` fails immediately if there's a incompatibility

## Rules that must never be violated

- `npm run build` must pass
- No new dependencies
- No changes to source code or configuration files
- `package.json` type `"module"` and `"engines"` remain untouched

## Risks

- Operational: n/a
- Security: n/a (upgrades only reduce risk)
- Compliance: n/a

## Acceptance criteria

- [ ] `npm run build` exits 0
- [ ] `package-lock.json` is regenerated in sync with `package.json`
- [ ] No diff in source files, only `package.json` and `package-lock.json`

## Rollback

Revert the single commit: `git revert HEAD`. No data side-effects.

## Effort

**XS** — single file edit (package.json), `npm install`, build gate.