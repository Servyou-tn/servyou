# PR-F1 Discovery Report — Freelancer Workspace Foundation

**Date:** 2026-06-24
**Status:** Discovery only. No code written. Architecture decisions pending before the build prompt.
**Schema state:** Live in production — migration `20260606212937_freelancer_configurable_workspace` (confirmed in a prior session; columns + 3 child tables + RLS all present).

---

## The headline finding

The entire freelancer workspace — profile form, all three child-table editors, the
diff-save orchestration, the create/edit pages, and the public page — **was already
built and then deleted** in one cleanup commit:

```
59cb952  chore(cleanup): delete Phase 1-6 pages + consumer dashboard; keep data layer + business components
```

It was built as PR-H1 (scalar columns) + **PR-H2** (the child tables — the diff-save).
The deletion was intentional scope-clearing before the consumer-space redesign; the
commit message explicitly *"keep[s] data layer + business components."* So the **logic
survives, the UI was removed.** Every file is recoverable from `59cb952^`.

**PR-F1 should treat this as "re-skin and re-mount proven logic," not "design from
scratch."**

---

## Thread 1 — The chip multi-select pattern (template for `freelancer_tools`)

Reference: **`src/components/FreelancerToolsEditor.tsx`** (deleted, 68 lines) — the cleanest
possible template because it *literally* already targets `freelancer_tools`.

- Controlled chip input bound to a `ToolRow[]` held by the parent form.
- Local `pendingName` state + an "Add" button and `Enter`-to-add (`onKeyDown` preventDefault).
- **Client-side case-insensitive dedup** on add, with a comment correctly noting the DB
  `UNIQUE(freelancer_id, name)` is the *authoritative* guard (app check = UX, DB = real guard).
- Chips render as `bg-blue-50 text-blue-700 … rounded-full` with a `×` remove button carrying
  `aria-label={t('common.delete')}`.
- It does **not** write to the DB itself — only mutates parent state. Persistence is centralized
  in `FreelancerForm` (Thread 3).

Read-side twin: the live skills chip on the public page (`freelance/[id]/page.tsx`).

⚠️ **Naming trap (see decision 3 below):** the legacy `freelancer_skills` table keys on
`freelancer_profile_id`; the **new** child tables key on `freelancer_id`.

---

## Thread 2 — The repeatable-card pattern (template for `education` + `certifications`)

References: **`src/components/FreelancerEducationEditor.tsx`** (83) and
**`src/components/FreelancerCertificationsEditor.tsx`** (78) — near-identical, same shape:

- Parent holds `EducationRow[]` / `CertificationRow[]`; editor exposes three handlers:
  `addRow()` (push blank row), `removeAt(idx)`, `update(idx, patch)` (immutable map-merge).
- Each row is a bordered card (`rounded-md border bg-gray-50 p-4`) with an absolutely-positioned
  delete button; fields in a `grid-cols-1 sm:grid-cols-2` responsive grid.
- **Per-row inline validation:** a row with the required field blank but other fields filled
  shows an inline error (institution / certification name required).
- Years are integers via a `parseYear` helper (`'' | NaN → null`), with "blank year_end = ongoing"
  hint text — matching the schema's nullable `year_end`.

Read-side rendering already exists (`freelance/[id]/page.tsx`) including a `formatYearRange()`
helper rendering `2018 — 2022` or `2018 — {ongoing}`.

---

## Thread 3 — The diff-save strategy (PR-H2, and the shop parallel)

The single orchestrator is **`src/components/FreelancerForm.tsx`** (349 lines).

**1. Profile FIRST (canonical truth), then child tables.** On `create`, insert
`freelancer_profiles` → get `freelancerId`; on `edit`, update by id. Only after the profile
commits does it touch child tables. Every Supabase call captures `error` and bails with
`console.error('[FreelancerForm] …')` + a UI error key (no swallowed errors).

**2. Three diff shapes, by table semantics:**

| Table | Strategy | Why |
|---|---|---|
| `freelancer_tools` | **delete + insert only** | `UNIQUE(freelancer_id, name)` means a "rename" = remove-old/add-new. Diff: initial ids not in current → delete; rows without an id → insert. |
| `freelancer_education` | **delete / insert / update** | Stable ids. `toDelete` (initial ids absent from current), `toInsert` (no id), `toUpdate` (id present **and** a field actually changed, field-by-field with null-normalization). |
| `freelancer_certifications` | delete / insert / update | identical pattern |

**3. Fail-fast child validation before any DB write** — a partially-filled education/cert row
aborts the whole save so nothing is silently dropped.

**The shop parallel** — `src/components/ShopForm.tsx` (305, also deleted) confirms this is a house
pattern. Its children (`shop_payment_methods`, `shop_categories`) are **set-membership** (checkbox
toggles), so it uses the simpler two-way diff (`toInsert = selected not in initial` /
`toDelete = initial not in selected`) — no update path, because rows are just `(shop_id, value)`
join records. The codebase therefore has **both** flavors:

- **Set-membership diff** (shop checkboxes, freelancer tools) → insert/delete only.
- **Entity diff with stable ids** (education, certifications) → insert/delete/update.

---

## Thread 4 — Deleted page code (layout/structure reference)

All recoverable from `59cb952^`. Structurally useful:

- **`mon-profil-freelance/creer/page.tsx`** (51) & **`modifier/page.tsx`** (98) — thin client
  wrappers. `creer`: auth + `seller_type==='freelancer'` guard + "already has profile? redirect",
  then `<FreelancerForm mode="create">`. `modifier`: loads profile + all three child tables (each
  read with explicit error capture; education/certs ordered by year desc `nullsFirst:false`) and
  passes them as `initial*` props to `<FreelancerForm mode="edit">`. **This load-then-pass-initials
  shape is what makes the diff-save possible** — the form needs the original rows to diff against.
- **`freelance/[id]/page.tsx`** (248) — public read page (server component); full card layout for
  skills/tools/education/certifications/services.
- Also available: `mon-profil-freelance/page.tsx` (owner dashboard view, 194), `services/*`.

---

## What's already in the repo (PR-F1 does NOT rebuild these)

1. ✅ **Schema** — live in production (migration `20260606212937`).
2. ✅ **Type layer** — `src/lib/types/freelancer-config.ts` **survived the cleanup, byte-identical**
   to the recovered version (diffed). All interfaces + form-row shapes (`ToolRow` / `EducationRow` /
   `CertificationRow`: `''` for optional text in form state, `null` for years) are ready to import.
3. ✅ **i18n keys** — the `freelance.*` keys the editors reference **survived** in both `fr.ts` and
   `ar.ts` (spot-confirmed `section_tools`, `field_institution`, `edit_title`, `action_add_education`).
   Recommend a full key-presence sweep before building, but the bulk is there.

---

## The one real tension to decide before building

The recovered code uses the **pre-redesign visual language** (`bg-gray-50`, `bg-white rounded-lg
shadow`, `bg-blue-600`, raw `<form>`/`<input>` with hand-rolled `inputCls`). The current consumer
space runs on the **locked `marche` design system** (`src/components/marche/`: `MarcheLayout`,
`PageHeader`, `card-premium`, `SegmentedControl`, `EmptyState`, Sonner toasts, `outline-brand`).

Clean split for PR-F1:

- **Keep the logic** from the recovered files verbatim (diff-save, validation, child-table handlers).
- **Re-skin the presentation** against the current `marche` design system, using
  **`src/components/marche/MissionForm.tsx`** as the styling template (a current-design-system form),
  not the old `FreelancerForm` markup.
- **Reuse** the type layer and i18n keys as-is.

---

## Confirmed decisions (founder, 2026-06-24)

1. **Non-atomic save accepted for MVP.** The recovered code does sequential client-side writes
   (profile → tools → education → certifications), not one transaction. A mid-sequence failure
   leaves a partially-saved state. The recovered code's error-bail + user-retry handling is
   sufficient for MVP. Revisit only if it becomes a real user problem (a SECURITY DEFINER RPC doing
   all writes in one transaction is the upgrade path if needed).
2. **Naming: use `freelancer_id` throughout** on the new child tables (`freelancer_tools`,
   `freelancer_education`, `freelancer_certifications`). `freelancer_profile_id` is the **legacy**
   `freelancer_skills` convention — do NOT use it on the new tables.

---

## Still open (founder to finalize before the build prompt)

- `FreelancerLayout` vs reusing `MarcheLayout` for the workspace shell.
- Sidebar items for the freelancer workspace.
- `PageHeader` titles/subtitles per page.

---

## Next steps — recovery recipe for the build session

**Recover any deleted reference file** (read-only; do not restore into the tree blindly):

```bash
git show 59cb952^:<path>            # print to stdout
git show 59cb952^:<path> > /tmp/x   # or redirect to a scratch file to read
```

**Files to recover (logic to keep, re-skinned against `marche`):**

```
src/components/FreelancerForm.tsx                       # 349 — orchestrator + diff-save
src/components/FreelancerToolsEditor.tsx                #  68 — chip editor (Thread 1)
src/components/FreelancerEducationEditor.tsx            #  83 — repeatable card (Thread 2)
src/components/FreelancerCertificationsEditor.tsx       #  78 — repeatable card (Thread 2)
src/app/mon-profil-freelance/creer/page.tsx            #  51 — create wrapper + guards
src/app/mon-profil-freelance/modifier/page.tsx         #  98 — edit wrapper, load-then-pass-initials
src/app/mon-profil-freelance/page.tsx                  # 194 — owner dashboard view
src/app/freelance/[id]/page.tsx                        # 248 — public read page
src/components/ShopForm.tsx                             # 305 — set-membership diff parallel (reference)
```

**Already in the repo — import, don't rebuild:**

```
src/lib/types/freelancer-config.ts                     # type layer (byte-identical to recovered)
src/lib/i18n/fr.ts, ar.ts                              # freelance.* keys survived
```

**Visual template reference (build PR-F1 forms to match this, not the old markup):**

```
src/components/marche/MissionForm.tsx                  # current-design-system form
src/components/marche/PageHeader.tsx                   # page header pattern
src/components/marche/MarcheLayout.tsx                 # workspace shell candidate
src/components/marche/EmptyState.tsx                   # empty-state pattern
```

**Recovery commit anchor:** `59cb952` (`git show 59cb952^:<path>` reads the pre-deletion version).
