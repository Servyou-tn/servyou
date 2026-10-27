# H2 step 2 "Compétences & langues" (`feat/h2-step2-competences`, 2026-08-14)

## 🔴 10 pre-existing `freelancer_profiles.languages` values, dumped verbatim — NOT backfilled

- **What:** migration `20260814114009_freelancer_languages` supersedes the scalar
  `freelancer_profiles.languages` text column with a real `freelancer_languages` child table.
  The column is **left in place, unwritten going forward**, and its 10 pre-existing non-empty
  values are **not** parsed into the new table — founder ruling: parsing free-text prose into a
  language enum plus a proficiency enum risks writing wrong data under a real user's name, and 10
  rows is not worth a parser. Recorded here instead, so the data survives outside the column:

  | `freelancer_profile_id` | `profile_id` | raw `languages` text |
  |---|---|---|
  | `f351f4f0-da1c-4a6e-a99a-63f8b3932896` | `c138ca3e-1774-45be-ad65-2071c91cfe3e` | `français` |
  | `1b356f3c-7a4d-409f-8027-6cfc471d1a91` | `de300001-0000-4000-a000-000000000001` | `Français, Arabe, Anglais` |
  | `5a1c360f-eb01-42ef-9eb2-59d67ebd391f` | `de300001-0000-4000-a000-000000000002` | `Français, Arabe` |
  | `23b1905e-aaff-44dd-9ec2-15279300949c` | `de300001-0000-4000-a000-000000000003` | `Français, Arabe, Anglais` |
  | `dd823c18-6dfd-4f89-8f83-3650a94bc882` | `de300001-0000-4000-a000-000000000004` | `Français, Arabe` |
  | `fea85733-f5a9-4e3d-8c61-dcf59ac41e95` | `de300001-0000-4000-a000-000000000005` | `Français, Arabe` |
  | `aa44d8b9-15fc-4841-b695-fe54b492c696` | `de300001-0000-4000-a000-000000000006` | `Français, Arabe` |
  | `7cbafed5-4631-4039-b3ab-6df9a1b99f6a` | `de300001-0000-4000-a000-000000000007` | `Français, Arabe` |
  | `8b71dae0-ef99-4177-8416-aa60f701710a` | `de300001-0000-4000-a000-000000000008` | `Français, Arabe, Anglais` |
  | `3760cf7d-b129-4f42-a873-cdd970bffdb5` | `de300001-0000-4000-a000-000000000009` | `Français, Arabe` |

- **Consequence — a known, accepted gap:** these 10 users will see an **empty** language section
  on any surface that reads the new `freelancer_languages` table, despite having typed something
  into the old flat field previously. No proficiency was ever captured in the old column (it was
  a bare free-text list), so even a hand-mapping can only recover the language set, not the
  niveau — whoever eventually does the hand-mapping should default new rows to a neutral
  proficiency (e.g. `'courant'`) rather than guess `'natif'`.
- **Trigger:** a founder-directed hand-mapping pass (small enough to do by hand off the table
  above — max 3 languages per row, all `Français`/`Arabe`/`Anglais`), or simply let these 9 seed
  accounts + 1 real account re-enter their languages through the new step 2 UI next time they
  visit.

## Shared tag-input (Chip/Combobox) now wanted — second real consumer coming

- **What:** H2 step 2's Compétences field needed a free-text tag-combobox (search input +
  dismissible chips, min 3 / max 15). No shared `Chip`/`Tag`/`MultiSelect`/`Combobox` exists in
  `src/components/ui/` — built route-local under
  `mon-profil-freelance/creer/competences/_components/SkillsInput.tsx` on top of the F3 `Input`
  primitive (reused for its `counter` support, which the live "3/15" needed) + dismissible Badge
  chips, same as step 1's Ville field stayed a route-local native `<select>` rather than reaching
  for a nonexistent shared `Select`.
- **Why this is worth tracking now, unlike Ville:** `job_post_skills` (job-board skill tags,
  migration `20260603182702`) is the **same free-text tag shape** — one row per tag, no catalog —
  and the job-posting create flow (H9/H12, not yet rebuilt to the v2 shell) will need the
  identical control. That makes this component's second real consumer already visible on the
  roadmap, unlike `popover.tsx` (untouched shadcn boilerplate on non-Servyou tokens, zero real
  consumers) or `Select` (still route-local everywhere, no second consumer in sight).
- **Trigger:** the job-posting create/edit rebuild — promote `SkillsInput` to
  `src/components/ui/` at that point (matching `Stepper`'s own documented "promote at third
  consumer" convention would mean waiting for a third; two independent real consumers for a
  component this small is enough to promote early, but that's a call for whoever picks up the
  job-posting rebuild, not decided here).

## `freelancer_skills` still has no UPDATE policy — now confirmed an inconsistency, not a pattern

- **What:** `freelancer_skills` (migration `20260603182632`) has SELECT/INSERT/DELETE RLS
  policies but no UPDATE. When H2 step 2 needed the equivalent policy shape for the new
  `freelancer_languages` table, `shop_payment_methods`/`shop_categories` (migration
  `20260606192321`, the tables `reconcile.ts` was originally built for) turned out to both use a
  single `FOR ALL` owner-scoped policy — which **does** grant UPDATE, even though neither table's
  own reconcile-based write flow ever issues one. `freelancer_languages` was built matching that
  `FOR ALL` precedent, not `freelancer_skills`' narrower shape. So "insert/delete only" is
  confirmed **not** the established pattern in this codebase — `freelancer_skills` diverges from
  its own closest analog, on both sides now (shop tables and its own sibling
  `freelancer_languages`).
- **Why not fixed here:** blocks nothing on the create form (a fresh profile's `previous` skill
  set is always empty, so every submit is INSERT-only — UPDATE is never reached). Would matter
  for an eventual edit-in-place surface built to update a skill string without a delete+insert
  round trip, but no such surface exists yet.
- **Trigger:** H3 "Modifier mon profil" (the freelancer profile editor) — add the UPDATE policy
  then if the edit flow's design calls for in-place skill edits rather than delete+insert
  (mirroring how step 2's own skills chip-list already resolves an edit as delete+insert, which
  needs no UPDATE at all — check whether H3 actually needs one before assuming it does).

## 🔴 `AppShell`'s root wrapper overflows by 16px at 320px — pre-existing, not introduced by step 2

- **What:** the live 7-width CDP sweep for this PR (320/375/412/768/1024/1280/1440, both FR and
  AR) found a consistent **16px horizontal overflow at exactly 320px**, identical in both
  languages, on `/mon-profil-freelance/creer/competences`. Traced the overflowing element
  directly (`getBoundingClientRect` on every node, found the widest `right` edge): it is
  `AppShellClient.tsx:81`'s own root `<div className="flex min-h-screen bg-surface-subtle">` —
  not anything inside step 2's own box (`SkillsInput`, `LanguageRepeater`, the field stack).
  375px and every wider width tested clean (0 overflow) in both languages.
- **Why this is logged, not fixed here:** the culprit is shell-level code this PR didn't touch,
  shared by every route using `AppShell` — fixing it means auditing `AppShellClient.tsx`'s
  sidebar (`hidden lg:block`, so already off at mobile widths) and the mobile drawer
  (`w-[280px] max-w-[85vw]`, `absolute`) for a `min-w-0`-class gap, the same bug shape this PR
  independently found and fixed twice in its own new code (`LanguageRepeater`'s two-select row,
  confirmed via the same live screenshot method). That's a shell PR, not a step-2 PR — "one PR,
  one focus."
- **Distinct from the already-closed 375px topbar overflow** (`fix/appshell-topbar-and-pitch-
  pages`, 2026-08-13, logged earlier in this file) — that fix targeted 375px specifically and
  375px is confirmed clean here; this is a narrower, 320px-only residual gap the 375 fix's own
  verification pass never checked, since 320px is the standard's documented minimum
  (`servyou-standards-reference.md` §5) but was not part of that PR's own test width set.
- **Trigger:** the next AppShell/Topbar pass, or whenever a founder-facing report of a 320px
  device (older low-density Androids, the standard's own stated reason for testing this width)
  shows a sliver of horizontal scroll on any authenticated page.
