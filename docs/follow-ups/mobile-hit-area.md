# Mobile tap targets follow-ups (`fix/mobile-hit-area`, 2026-11-06)

## Three spots cannot reach 44 without a layout change
- **What:**
  - Footer links (17 px rows, 12 px apart) reach 32.
  - « Mot de passe oublié ? » reaches 42.
  - « Parcourir tout » on the no-results search page reaches 36.
- **Why deferred:** the rule for this PR is zero painted change. An invisible extension can only take half the gap to a neighbour, or it steals that neighbour's taps.
- **Where it lives:** `src/components/layout/Footer.tsx`, `src/app/connexion/components/SigninForm.tsx`, `src/components/recherche/SearchEmptyState.tsx`.
- **Trigger:** the founder OKs a mobile-only layout change (e.g. `max-lg:py-3` rows), which moves those VRT baselines.

## Dropdown items and filter-control rows sit on a 32–36 px pitch with no gap
- **What:**
  - Radix `DropdownMenuItem` / `CheckboxItem` / `RadioItem` are `py-1.5`, about 32 px.
  - The account-menu items are `py-2`, about 36 px.
  - `FilterControl`'s 16 px box sits in a `py-1.5` label row.
  - In each case the rows touch each other, so no hit extension can be added without one option taking the next one's tap.
- **Why deferred:** same rule. 44 needs `max-lg:min-h-11` rows (a painted change inside the open menu or filter sheet).
- **Where it lives:** `src/components/ui/dropdown-menu.tsx`, `src/components/ui/filter-control.tsx` and their row call sites (`SearchFilters`, `SidebarSelectFilter`, `SkillsPicker`, `AccountMenu`, `ProfileAvatarMenu`, `TopbarUserMenu`, `HelpDropdown`).
- **Trigger:** founder OK for taller mobile rows.

## Signed-in pages were checked statically, not probed
- **What:** the 375 probe ran on the 12 public routes. The dashboards, `mes-*`, `parametres` and admin were covered by the AST scan (0 left) but not measured in a browser.
- **Why deferred:** `scripts/gate/session.mjs` mints a real session on production auth (a write), and that needs the founder's OK.
- **Where it lives:** `scripts/gate/authed.mjs` + the probe in `docs/design/mobile-hit-area-probe.md`.
- **Trigger:** founder OKs gate sessions for a shop owner, a freelancer and an admin test account.
