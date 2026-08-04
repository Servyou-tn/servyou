# `categories.kind` — discovery

**REPORT ONLY.** No DDL run, no rows touched, nothing built.
**Date:** 2026-08-04 · **Branch:** `feat/categories-kind-discriminator` off `origin/main` @ `ca5e24c`

---

## 0. Headline — this fixes **two** live pickers, not one

G6 was the reason to add a discriminator. Discovery found the **mirror-image defect already
shipped**:

> **`/mes-missions/nouvelle` — the freelance-mission posting form — offers all 14 categories,
> including Automobile & Accessoires, Beauté & Soins, Électronique, Maison, Mode and Santé.**

Counted by loading the page with a real session and parsing its `<option>` elements: **options 2–15
are all 14 categories**, unfiltered. A user posting a freelance mission today can file it under
"Électronique".

`getCategories` (`my-data.ts:434`) does `.select('id, name_fr').order('name_fr')` with no filter —
because there is no column to filter on. That is the same missing discriminator, and it is live now,
not hypothetical.

**Also relevant to the design:** `categories` is referenced by **four** entities, not two —
`products`, `service_listings`, **`job_posts`** and **`shop_categories`**. `job_posts` uses only
`developpement` (3 rows); `shop_categories` is **empty** (0 rows, all categories).

---

## 1. The four unknowable rows — evidence and recommendation, individually

All four have **zero** products, services, job_posts and shop_categories, so usage cannot classify
them. Evidence comes instead from the two taxonomy files, which are the documented product/service
split.

The service taxonomy is **entirely digital-freelance** (`docs/design/taxonomy-services.md`:
Développement web & mobile · Design graphique · Design UI/UX · Marketing digital · Community
management · Rédaction · Traduction · Montage vidéo · Voix off · Consulting · Personal branding ·
Coaching Meta Ads · Coaching e-commerce). It contains **no** home, health, or automotive category.
That absence is itself evidence for three of the four.

### ① `automobile-accessoires` — "Automobile & Accessoires"

| evidence | |
|---|---|
| product taxonomy | **`auto-moto`** is one of the 11 sectors |
| service taxonomy | nothing automotive, at any level |
| name | "& Accessoires" — accessories are physical goods |

**→ Recommend `product`.** Confidence: high.

### ② `maison` — "Maison"

| evidence | |
|---|---|
| product taxonomy | **`maison-deco`** ("Maison & décoration") |
| service taxonomy | no home-services sector — the catalogue is digital freelance, so plomberie / ménage / bricolage are **not** in scope |
| MVP scope | CLAUDE.md's deferred list does not add home services |

**→ Recommend `product`.** Confidence: high *today*, with the caveat that "Maison" is the single
most plausible future `both` — a home-services vertical would land here. See §2 on why the CHECK
should admit `both` even though no row needs it yet.

### ③ `sante` — "Santé"

| evidence | |
|---|---|
| product taxonomy | **`sante-parapharmacie`** ("Santé & parapharmacie") |
| service taxonomy | no health sector |
| market | parapharmacy goods are a real Tunisian COD category; teleconsultation is not an MVP surface |

**→ Recommend `product`.** Confidence: high.

### ④ `data-science-analyse` — "Data Science & Analyse"

| evidence | |
|---|---|
| service taxonomy | **`data-analyse`** is a sector in `service-categories.ts` |
| product taxonomy | no data sector, and no plausible physical good |

**→ Recommend `service`.** Confidence: high.

### Proposed full backfill — all 14, for the record

| kind | slugs |
|---|---|
| **product** (6) | `mode`, `electronique`, `beaute-soins`, **`automobile-accessoires`**, **`maison`**, **`sante`** |
| **service** (8) | `developpement`, `design-creation`, `marketing`, `montage-video`, `redaction`, `business-conseil`, `ugc`, **`data-science-analyse`** |

Bold = the four awaiting your ruling. The other ten are settled by usage and are not in question.

**`job_posts` maps to the service side** — a freelance mission is service-shaped, and its one live
category (`developpement`) is service-used. **`shop_categories` maps to the product side** but has
zero rows, so it constrains nothing.

---

## 2. Nullable vs NOT NULL — recommendation and reasoning

### Recommend **`NOT NULL`, with a CHECK, and no DEFAULT.**

**Why not a default.** There is no honest one. `'product'` and `'service'` are each wrong for about
half the table, so a default would silently mislabel every future row — the exact failure this
column exists to prevent.

**Why not nullable.** A NULL kind is a category that **appears in no picker, with no error**. You
named that yourself, and it is correct for the four rows *until you rule* — but you are ruling now,
so no row needs NULL at write time. What remains is the *future* row: an admin adds a category and
forgets the kind. Nullable makes it silently invisible everywhere; NOT NULL makes the insert **fail
loudly** and forces the decision.

That failure shape — present in the database, doing nothing, reporting nothing — is precisely the
species this session has spent three PRs on: a storage policy that could never grant, and eight
image rows pointing at files that never existed. Both failed closed and silently. A schema that
refuses under-specification is the cheapest available defence.

**Why NOT NULL is safe here, verified rather than assumed:**

| risk | finding |
|---|---|
| an existing INSERT path would break | **No admin category route exists** — `grep src/app/admin` for categories is empty. The `Only admins manage categories` RLS policy exists, but nothing calls it. The only writer is a migration. |
| a generated types file would drift | **No generated types file exists** in the repo |
| backfill leaves a window | All 14 rows are set in the **same migration** as the column, before NOT NULL is enforced — add nullable → backfill → set NOT NULL |

### CHECK vocabulary: recommend **`('product', 'service', 'both')`** — admitting `both` with zero rows using it

No row needs `both` today. Including it anyway follows an established precedent in this codebase:
`order_events`' CHECK **already admits `'print'`** although no RPC writes it — deliberately left in
when the print RPC was deferred (`g9-deltas-3.md` A-5).

The cost is one word in a CHECK, and it means pickers write `kind in ('product','both')` from day
one rather than being rewritten when "Maison" or "Santé" grows a services side. If you would rather
not admit an unused value, the binary works and the later change is a CHECK migration plus two
picker queries.

---

## 3. Does any category reader break? — verified by **loading**, not by tracing

### Every reader, and what it selects

There are **six** live readers. **None uses `select('*')`** — every one names its columns, so an
added column cannot change any response shape:

| reader | selects | surface |
|---|---|---|
| `category-data.ts:26` | `id, slug, name_fr, name_ar, parent_id` | `/categories/[slug]` |
| `category-data.ts:44` | `id, slug, name_fr, name_ar` | `/categories/[slug]` (subcategories) |
| `search-marketplace.ts:311` | `id` | `/recherche`, `/categories/[slug]` |
| `filter-categories.ts:42` | `slug, name_fr, name_ar` | `/recherche`, `/categories/[slug]`, `/marche/services` |
| `my-data.ts:434` | `id, name_fr` | `/mes-missions/nouvelle` |
| `DashboardRightRail.tsx:34` | `name_fr, slug` | **orphaned — nothing imports it** |

Database side: **no views over `categories`** (checked `pg_views`), RLS is `SELECT true` +
`ALL is_admin()` (a new column changes neither), and five FKs point *at* categories — none is
affected by a column on the parent.

⚑ One real side effect: `categories_set_updated_at` is a **BEFORE UPDATE** trigger, so the backfill
will bump `updated_at` on all 14 rows. Harmless — **nothing in the codebase reads
`categories.updated_at`** (grep: 0 hits) — but it is a change and should not surprise anyone.

### Measured baseline — 7 surfaces, real signed-in session

Loaded on `main` @ `ca5e24c`, before any change. **The apply step must reproduce this exactly.**

```
  /                                  status=200 bytes=100752 categoryNamesRendered= 0
  /categories/electronique           status=200 bytes= 96440 categoryNamesRendered= 2
  /categories/developpement          status=200 bytes= 92006 categoryNamesRendered= 2
  /recherche?q=iphone&type=product   status=200 bytes=100477 categoryNamesRendered= 3
  /recherche?q=logo&type=service     status=200 bytes=107336 categoryNamesRendered= 8
  /marche/services                   status=200 bytes=105704 categoryNamesRendered= 5
  /mes-missions/nouvelle             status=200 bytes= 65405 categoryNamesRendered=14
```

Probe preserved for re-run at apply time.

**Two honest caveats about this instrument:**

1. **It is a change-detector, not a semantic count.** `categoryNamesRendered` does substring
   matching, so short common names produce false positives — "Mode" matches inside "Mode de
   livraison", which is why `/categories/developpement` reports 2. The same false positives occur
   in both runs, so an exact before/after match still proves nothing moved; the absolute numbers
   just are not "category options offered".
   *(The first run of this probe under-counted by 5 because names containing `&` are HTML-escaped
   in the response. Fixed before the baseline above was taken — recorded because an uncorrected
   fingerprint would have made a real change look like noise.)*
2. **A baseline is not proof of the post-state.** I cannot demonstrate the after-condition before
   applying. What is established: the structural argument above (no `select('*')`, no views, no
   generated types, RLS untouched) plus a measured before-state to compare against. The proof is
   the post-apply re-run.

The precise number — 14 options on `/mes-missions/nouvelle` — was taken separately by parsing
`<option>` elements rather than by substring matching, which is why §0 can state it exactly.

---

## 4. Proposed migration shape

```
1. alter table categories add column kind text            -- nullable, so the table is valid mid-migration
2. update categories set kind = … for all 14 rows          -- explicit, no default, no guessing
3. alter table categories alter column kind set not null
4. alter table categories add constraint categories_kind_check
     check (kind in ('product','service','both'))
```

Order matters: add nullable → backfill → NOT NULL → CHECK, so the table is never in a state that
rejects its own rows.

**Not in this PR:** consuming the column. G6's picker and `/mes-missions/nouvelle`'s picker both
want `kind in (…)` filters, but this PR ships the column and the data only. The job-post picker fix
is a genuine bug fix and should follow immediately — flagged rather than bundled, since it is
application code with its own verification.

---

## Awaiting your ruling on the four. Nothing has been applied.
