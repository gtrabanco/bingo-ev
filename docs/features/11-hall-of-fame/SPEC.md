# 11 — hall-of-fame (top navigation bar)

## Goal

Introduce a single **top navigation bar** on the game page that consolidates the
four discovery/identity affordances that are today scattered or buried: the **Hall
of Fame** link, the **Google / X login** buttons, the **logged-in user** chip
(label + logout + public-profile control), and an entry point to the
**device-transfer** flow ("use this card on another device, or pull one in from
another device"). The first slice — renaming `/galeria` → `/hall-of-fame` and adding
a bare nav link — already shipped in [PR #22](https://github.com/gtrabanco/bingo-ev/pull/22);
this feature completes the navbar by relocating the account bar and the
device-transfer control into it.

## Branch

`feat/11-hall-of-fame`

## Size

`S` — no backend, no schema, no new dependency. It is an HTML/CSS relocation of
existing, already-wired elements into a navbar container, preserving every element
`id` so the existing client `<script>` keeps working untouched. This SPEC is the
only planning artifact; implement in a single pass with `execute-phase 11`.

## Dependencies

**Soft:** [PR #21](https://github.com/gtrabanco/bingo-ev/pull/21) (script-crash fix —
`document.querySelector` for the conditionally-rendered login buttons) should merge
first; without it, building the navbar on top of the throwing `$()` declarations
re-introduces the dead-listener crash whenever a provider env var is absent.

**Hard:** none. Accounts (05), gallery (03), device-code transfer, and the profile
control (09) are all already merged — this feature only re-homes their UI.

## Context

Today the game page (`src/pages/index.astro`) presents these controls in three
different places:

- **Hall of Fame link** — a lone `<nav>` under the header (shipped in PR #22).
- **Account bar** (`#account-bar`) — a centered row *under the tagline*: logged-out
  shows the Google/X buttons; logged-in shows the user label, logout, and the
  feature-09 profile control.
- **Device-transfer** (`#device-code-btn` + `#device-code-panel`) — a full-width
  button buried in the card-management stack ("Abrir en otro dispositivo"), only
  visible once a card exists.

The result is that the two most identity-relevant actions (log in, move your card
to another device) are hard to find, and the page has no consistent navigation
surface. A single top navbar fixes discoverability and gives later features (06,
12) a stable home for new entry points.

## Business goals

- Make **login** and **device transfer** discoverable — both are the gateway to the
  durable-identity features (diplomas across devices, profiles) the project is
  building toward.
- Give the "Hall of Fame" a prominent, persistent link to drive gallery traffic.

## Technical goals

- One navbar container owns all top-level navigation/identity controls.
- **Zero churn to client logic:** every relocated element keeps its existing `id`
  and stays in the DOM under the same render conditions, so `src/lib/api.ts`
  wiring and the `index.astro` `<script>` need no behavioral change — only the
  element refs' positions in markup move.
- The navbar degrades the same way the current controls do: hidden until JS
  resolves session state (no layout flash), login buttons only render when their
  provider env var is set, device-transfer entry only shows when a card exists.

## Scope

### In scope

- A top navbar on `src/pages/index.astro`, above the `<header>`, containing:
  1. **Hall of Fame** link (relocated from the under-header `<nav>`).
  2. **Account area** — the existing `#account-bar` block (logged-out login
     buttons + logged-in user chip/logout/profile control) relocated into the
     navbar, with its `id`s and conditional rendering preserved.
  3. **Device-transfer** entry — the existing `#device-code-btn` relocated into the
     navbar (renamed label, see Design), still toggling `#device-code-panel`.
- Provider **logos** already added on the login buttons (PR #21) carry over.
- Responsive behavior: the navbar wraps gracefully on narrow (mobile) viewports;
  no hamburger/collapse menu in this feature (kept simple — see non-goals).
- Update the device-transfer button **label** to a bidirectional-friendly wording
  (see Decisions).

### Out of scope / non-goals

- **Bidirectional device transfer behavior** — owned by **feature 12**
  (`bidirectional-device-transfer`). This feature only relocates and relabels the
  *entry point*; the underlying flow stays one-directional (generate-here →
  claim-elsewhere) until 12 ships.
- **Hamburger / collapsible mobile menu** — if the wrapped navbar proves too busy
  on mobile, a collapse menu is a follow-up, not part of this slice.
- **New navigation destinations** (achievements, profile dashboard) — added by
  their own features when they exist.
- **Any change to the account, gallery, or device-code endpoints** — UI-only.

## Architecture impact

Touches only `src/pages/index.astro` (markup reorganization + the small client
refs that read these elements). No `src/lib` logic change, no endpoint change, no
schema. Honors the hard conventions:

- The relocated login buttons remain conditionally rendered (`{hasGoogle && …}`,
  `{hasX && …}`); their refs must use `document.querySelector` (null-safe), never
  the throwing `$()` — this is exactly the PR #21 fix, which is why that PR is a
  soft dependency.
- All UI strings stay es-ES, dry-sarcastic tone, no brand names.
- The navbar is server-rendered markup in the existing `prerender = false` page;
  no new route.

## Design

### Layout

A horizontal navbar as the first child of `<main>` (or just inside it, above
`<header>`), full-width within the page's `max-w` container:

```
┌──────────────────────────────────────────────────────────────┐
│  Hall of Fame        [Cambiar de dispositivo]   [login area]  │
└──────────────────────────────────────────────────────────────┘
```

- **Left:** the "Hall of Fame" link.
- **Right (or wrapping):** the device-transfer entry and the account area.
- On narrow screens the row wraps to multiple lines (`flex-wrap`), staying legible
  without a collapse menu.
- The navbar itself is always rendered, but the account area stays `hidden` until
  JS resolves the session (unchanged `#account-bar` behavior), and the
  device-transfer entry stays `hidden` until a card exists (unchanged
  `#device-code-btn` behavior).

### Element relocation (ids preserved)

| Element | From | To | Behavior change |
|---|---|---|---|
| `#account-bar` (+ children `#account-loggedout`, `#account-loggedin`, `#btn-login-google`, `#btn-login-x`, `#account-label`, `#btn-logout`, profile control) | under the tagline | navbar (right) | none — markup moves verbatim |
| `#device-code-btn` | card-management stack | navbar | label changes; still `aria-controls="device-code-panel"` |
| `#device-code-panel` | inline after the button | anchored under the navbar entry (dropdown), or kept inline directly below the navbar | visual position only |
| Hall of Fame `<nav>` link | under `<header>` | navbar (left) | none |

The `#device-code-panel` is the one element whose *position* genuinely changes
(from the card-management stack to the navbar). Keep it as a panel toggled by
`#device-code-btn`; the simplest correct option is to render it immediately below
the navbar so the existing show/hide toggle keeps working with no JS change.

### Device-transfer label

The current label "Abrir en otro dispositivo" describes only one direction.
Because feature 12 makes the flow bidirectional, the navbar label should already
read as bidirectional. **Recommended: "Cambiar de dispositivo"** — short (fits the
navbar), familiar UX idiom, and direction-neutral. The panel body keeps the
explanatory copy. Alternatives considered: the user's own phrasing "Reutilizar
este cartón o de otro dispositivo" (accurate but long for a navbar), "Conectar
dispositivo", "Usar en otro dispositivo" (reads one-directional). See Decisions.

### Render-condition invariants (must hold after the move)

- Login buttons: only in DOM when their provider env var is set.
- Account area: `hidden` class until JS resolves session, then JS toggles
  logged-in/out — unchanged.
- Device-transfer entry: `hidden` until a card exists
  (`deviceCodeBtn?.classList.toggle('hidden', !card.id || card.secret === null)`)
  — unchanged.

## Decisions to confirm

### D1 — Device-transfer navbar label

**Recommended:** "Cambiar de dispositivo". **Rationale:** fits the navbar, is
direction-neutral (future-proof for feature 12's bidirectional flow), and matches a
familiar UX idiom. Owner to confirm or pick an alternative; the user suggested
"Reutilizar este cartón o de otro dispositivo".

### D2 — Mobile navbar: wrap vs collapse

**Chosen:** wrap (`flex-wrap`), no hamburger. **Rationale:** keeps this slice S and
avoids a JS collapse menu. Revisit only if the wrapped row is too noisy on mobile —
then a collapse menu becomes its own follow-up.

### D3 — Device-code panel placement

**Chosen:** render `#device-code-panel` directly below the navbar, toggled by the
existing button. **Rationale:** preserves the current show/hide JS with zero change;
a true anchored dropdown/popover is a nicety, not required.

## Acceptance criteria

- A top navbar is visible on the game page above the header, containing the Hall of
  Fame link, the account area, and the device-transfer entry.
- The "Hall of Fame" link navigates to `/hall-of-fame`.
- Logged out (with providers configured): the navbar shows the Google and X login
  buttons with their logos.
- With **no** provider env vars set: no login buttons render, **and no script
  crash** — every other control (including device transfer) still works.
- Logged in: the navbar shows the user label, logout, and the profile control;
  login buttons are hidden.
- The device-transfer entry is hidden until a card exists, and clicking it toggles
  `#device-code-panel` (generates a code + QR) exactly as before.
- The account area is hidden until JS resolves the session (no layout flash).
- Navbar wraps legibly on a 360px-wide viewport.
- `npm run build` passes.

## Testing requirements

No test suite — gate is `npm run build` green. Manual verification via `npm run
dev` (and the preview MCP) across the dev scenarios below. Because login buttons
and the account area are env/session-conditional, verify both the providers-set and
no-providers states locally (toggle `.dev.vars`).

## Dev scenarios

| Scenario | Reproduces | Mechanism it drives |
|---|---|---|
| `navbar:logged-out` | login buttons visible in navbar | open the game with `.dev.vars` providers set, no session cookie |
| `navbar:no-providers` | navbar with no login buttons and no crash | remove `GOOGLE_OAUTH_CLIENT_ID` / `X_OAUTH_CLIENT_ID` from `.dev.vars`, reload, click device transfer |
| `navbar:logged-in` | user chip + logout + profile control in navbar | complete an OAuth login, reload |
| `navbar:device-transfer` | device-transfer entry toggles the code/QR panel | with a card present, click the navbar device-transfer item |
| `navbar:no-card` | device-transfer entry hidden | clear localStorage card, reload |
| `navbar:mobile-wrap` | navbar wraps without overflow | resize preview to 360px |

## Phases

Single-pass (S): one commit on `feat/11-hall-of-fame`.

- **P0 — planning:** this SPEC (done).
- **P1 — implement:** build the navbar, relocate `#account-bar`,
  `#device-code-btn`/`#device-code-panel`, and the Hall of Fame link into it;
  relabel the device-transfer button; verify dev scenarios; gate; commit.
- **PR:** the existing PR #22 (already open on this branch) is extended with the
  navbar commit, or a fresh PR if #22 has merged by then.

## Deploy & rollback

n/a — UI-only, no migration. Rollback = revert the commit / PR.

## Open questions / risks

- **Risk: relocating markup breaks the top-level `$()` refs.** Mitigated by keeping
  every `id` and by the PR #21 null-safe `querySelector` change (soft dep).
- **Risk: navbar too busy on mobile.** Accepted for this slice (D2); collapse menu
  is a tracked follow-up if needed.
- **Inherited:** the `#device-code-panel` position is the only real layout move —
  verified working via the existing toggle (D3).

## Deliverables

- `src/pages/index.astro` — top navbar markup with the relocated account bar,
  device-transfer entry, and Hall of Fame link; relabeled device-transfer button.
- `docs/features/11-hall-of-fame/SPEC.md` (this file).
- Roadmap entry 11 updated to reflect the expanded scope.

## Post-merge next feature

`12-bidirectional-device-transfer` — makes the device-transfer flow the navbar now
surfaces work in both directions (Tesla shows QR → phone scans → Tesla loads the
phone's card).
