# /ma-boutique/creer (G2 step 1 — Bases) — discovery record

**Provenance.** Written in one pass, 2026-08-11. Layout facts are **📐 MEASURED** — one
`get_metadata` read of `555:37236` (`right`), file `jDNjJ8D1gnXiW7Ry3GkN4U`, per the brief's budget.
Everything else (schema, RLS, live data, in-repo component contracts) was read live from the
database and the working tree the same day. No 🧠 memory carried in: no prior G2 build memory
existed to reconcile against, unlike D1's second pass.

**Copy caveat, same limit D1 hit at §6 of `d1-discovery.md`.** `get_metadata` returns text-node
*bounds*, not *content*, for anything inside an instance (Button labels, Avatar). The frame's own
top-level text nodes DID come back with copy (H1, subline, field helper strings below) — those are
verbatim. Field labels for `field-nom` / `field-ville` / `field-desc` are inside instances and are
therefore taken from the brief's own field list, not from Figma.

**Calls spent: one.**

---

## 1. The frame

`555:37234` "Creer ma boutique - 1440" → `Sidebar 555:37235` + `right 555:37236` (measured).

No 375/mobile frame exists for G2 — same gap D1 and C1 already logged for their own pages. This
page has no rigid multi-track grid (see §5), which is what makes the absence of a mobile frame far
lower-risk here than it was for D1.

## 2. Page structure — 📐 MEASURED (`555:37236`, 1200×1259)

```
right 1200×1259
  Topbar                                    1200×64
  content @ y=64                            1200×1115
    column @ (220,32)                        760×1043   ← centred: 220+760+220=1200
      top                                    760×216
        page-header                         760×92
          Breadcrumb                        265×17
          H1 "Créer ma boutique"        @y25 281×38        gap 8
          subline (2 lines, verbatim below) @y71 760×21    gap 8
        Stepper @y116                       760×100        gap 24 (from page-header)
          step "1 · Bases"          100×65  (circle 36×36 @x32, label @y44 gap 8)
          conn                       40×36  (2px rule @y17, vertically centred on circle)
          step "2 · Configuration"  100×65  @x140
          — stepper's own content is only 240px wide, left-aligned in the 760 column, NOT full-width
      boxWrap @y216                          760×827        gap 0 (top's own height closes exactly)
        box @y32-in-boxWrap                  760×795        (24px padding all sides, closes exactly)
          field-logo    @(24,24)   712×100
          field-banner  @(24,144)  712×200   gap 20
          field-nom     @(24,364)  712×97    gap 20   [instance, Input composite]
          field-ville   @(24,481)  712×97    gap 20   [instance]
          field-desc    @(24,598)  712×173   gap 20   [instance, Textarea composite]
  footer @y1179 (sibling of content, full-bleed)   1200×80
    Button (secondary, left)        @(32,20)  288×40
    nav @(1077,20) 91×40
      Button "Précédent" — hidden=true         120×40   (no prev step on step 1)
      Button "Suivant"                          91×40
```

Every gap between `box` children is a uniform **20**. `box` closes exactly: `24 + 771(content) + 24
= 795` ✓. `content` height (1115) meets `footer`'s y (1179) exactly at `64(topbar)+1115=1179` — the
footer is a full-bleed sibling below content, not part of the scrolling column.

### 2a. `field-logo` (712×100) — avatar + upload button + helper

```
avatar-ring 128×128 @ (0,-14)   ← OVERFLOWS the field's own top edge by 14px. Do not clip this box.
  Avatar instance        120×120 @ (4,4)
  photo-edit-badge        32×32  @ (88,88)   ← anchored at the avatar's bottom-end corner
    icon-camera            16×16 @ (8,8)      centred in the badge
Frame (text col) 568×82 @ (144,9)             144 = 128(ring) + 16 gap
  Button                 128×32  @ (0,0)
  helper text (2 lines)  568×42  @ (0,40)      gap 8
    "Votre logo apparaît sur votre boutique et vos bons de livraison. (optionnel mais recommandé)"
```

### 2b. `field-banner` (712×200) — centred drop-zone, NOT a side-by-side row

```
icon-camera   28×28  @ (342, 49.5)   — centre x = 356 = 712/2 exactly
Button       166×32  @ (273, 89.5)   — centre x = 356, gap-above 12
helper text  273×17  @ (219.5,133.5) — centre x = 356, gap-above 12
  "L'image d'en-tête de votre boutique. (optionnel)"
```

Content block spans y 49.5→150.5 (101 tall) inside a 200-tall field: `(200−101)/2 = 49.5` ✓ —
vertically centred. This is a **centred single drop-zone**, structurally closer to
`ImageUploadGrid`'s empty-state dashed zone (`ImageUploadGrid.tsx:204-238`) than to the
avatar-plus-button row `field-logo` uses. Two different upload affordances on one page, both
measured, not one pattern applied twice.

### 2c. `field-nom` / `field-ville` / `field-desc`

All three are pre-built instances — `get_metadata` returns only their outer bounds (712×97,
712×97, 712×173). `field-desc`'s **173** height matches E1's `Textarea` instance height exactly
(`d1-discovery.md` §6c, `589:44197`, also 173) — same composite, same internal anatomy
(`Textarea.tsx`: label → min-h-30 field → helper/counter row). The "0/100" and "0/2000" counters
the brief specifies are exactly `Input`'s and `Textarea`'s existing `counter` prop
(`input.tsx:45`, `textarea.tsx:30`) — no new counter UI to build.

No internal geometry for the Ville select came back (same `get_metadata` instance-opacity limit
D1 hit for E1's Select triggers). The in-repo precedent is a native `<select>` styled to match
`Input`'s field box (`ProductRequestForm.tsx:295-321`, the `selectField` class) — reused verbatim
for consistency, not reinvented.

## 3. Reconciliation — ruling 1 (Ville) confirmed compatible

The frame draws ONE `field-ville`, not a city+governorate pair like E1-product's address block.
Ruling 1 already settled this as `tunisia-governorates.ts` (`GOVERNORATES`, 24 rows) — the
frame's single-field shape is consistent with a single governorate Select, not a free-text city.
No conflict to report.

## 4. Route + guard state today

`/ma-boutique/creer` — **404**, confirmed (no `src/app/ma-boutique/**` exists). It is
`DevenirVendeurContent.tsx:18`'s primary CTA, a dead link today, exactly as the brief states.

**`resolveOwnedShopId` (`src/lib/shops/owner-shop.ts`) already documents the danger this PR must
not trigger**: `shops.owner_id` has only a non-unique index; the module's own comment says "today
the sole shop owner holds exactly one and nothing in the app can create a second, which is
precisely what makes this dangerous" — `.maybeSingle()` elsewhere (`require-seller.ts:51`) throws
the day a second shop appears. **G2 is that "nothing" — this PR is the first code path anywhere
that can INSERT into `shops`.** The guard design in §7 exists specifically to keep that true.

Live data (read via Supabase MCP, 2026-08-11):

| table | finding |
|---|---|
| `shops` | **1 row** — "OM shop", owner `0f4c929b-…`, no logo/banner. No name collision risk for the UNIQUE index (§6). |
| `profiles.seller_type` | `null`×6, `shop_owner`×1, **`freelancer`×10** |
| `shops` constraints | PK, owner FK (cascade), `shop_type`/`delivery_setup` CHECKs, admin-moderation CHECK. **No unique constraint on `name` today.** |
| `shop-assets` storage policies | **INSERT + DELETE only, confirmed live — no SELECT.** Both already carry the `objects.name` alias-capture fix (migration `20260804104541`) — they are correctly scoped to `(storage.foldername(objects.name))[1] IN (shops owned by caller)`, just missing SELECT. |

**⚑ 10 live freelancer profiles — this is a real state, not a theoretical one.** §7c below is not
guarding against a hypothetical.

## 5. Why this page does NOT inherit D1's grid-overflow bug class

D1 broke because two RIGID tracks (`600px_504px`) summed to a fixed 1136 that didn't shrink. G2 has
**one column, one field per row, every field `w-full`.** There is no second track to overflow
against. The real responsive risks here are different in kind — see §8.

## 6. Migration — applied `20260811055734_shops_name_unique_and_asset_select`

Per the discovery-first-migration skill: reads above confirmed one live row, no collision, no
existing index on `name`. Proposed as a plain `UNIQUE(name)` with a flagged case-sensitivity gap;
**founder revised it to a case-insensitive index before approving** — "OM shop"/"OM Shop" both
passing is exactly the near-copy collision uniqueness exists to prevent. Applied as written below,
mirrored at `db/migrations/20260811055734_shops_name_unique_and_asset_select.sql`:

```sql
CREATE UNIQUE INDEX shops_name_lower_key ON public.shops (lower(name));

CREATE POLICY "shop-assets: shop owner reads own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'shop-assets'
    AND (storage.foldername(objects.name))[1] IN (
      SELECT s.id::text FROM public.shops s WHERE s.owner_id = (SELECT auth.uid())
    )
  );
```

Two consequences that ripple into the app code, both founder-directed:
- The app pre-check must query `lower(name) = lower($1)` (or `ilike`), not a plain `eq`, or the
  friendly inline check and this index can disagree — a name the pre-check called free still hits
  `23505` at insert if it differs only by case.
- `name` is trimmed server-side before either the pre-check or the insert — `"OM shop "` defeats a
  folded-case rule exactly as it would an unfolded one.

## 7. The three "report, don't resolve" items

### 7a. Does this PR need `.list()`?

**No.** `.list()`/sweep exists elsewhere (`sweepAvatarFolder`, `mon-compte/actions.ts:196`) to clean
up re-picks uploaded *before* the owning row exists. §7b's ordering means no image ever uploads
before the `shops` row exists, so there is nothing to sweep — a re-pick before submit only ever
replaces client-held `File` state, never touches storage.

**But `.info()` is still required** (ruling 4, carried over from #122) and — same as avatars and
product-images — that call goes through SELECT RLS. The migration in §6 adds the SELECT policy for
that reason, not for `.list()`.

### 7b. The upload-before-the-row-exists ordering

**Resolved as: don't upload before the row exists — invert the order instead.** Both images are
measured as optional ("*optionnel mais recommandé*" / "*(optionnel)*"), so nothing requires them to
precede the row the way G6's gallery does:

1. The form holds `logoFile` / `bannerFile` as client-side `File` objects with `blob:` previews
   (`ImageUploadGrid`'s already-proven pattern) — **zero network calls while the user is filling
   the form.**
2. On submit: `createShopAction` flips `seller_type` then inserts `shops` (name/city/description) —
   this is literally "insert the shop", per the brief. Returns `shopId`.
3. The client then calls `uploadShopLogoAction(shopId, file)` / `uploadShopBannerAction(shopId,
   file)` **one file per action call** (mirrors G6's one-request-per-image split — two raw phone
   photos together could exceed the 4.5 MB Vercel payload cap the same way eight product photos
   would). The row already exists, so the storage policy's `EXISTS`/`IN` check passes with zero
   policy changes beyond §6's SELECT addition.
4. Each upload action does normalize → upload → `.info()` integrity check → `UPDATE shops SET
   logo_url = …` — and on a failed UPDATE, compensating `remove([path])`, the exact shape
   `uploadAvatarAction` already uses (`mon-compte/actions.ts:157-163`).
5. Image failures are **non-blocking**: the shop already exists and is a legitimate row (ruling 3);
   a failed logo upload leaves a shop with no logo, which the design explicitly allows for. The
   form shows a toast, not a blocked redirect.

This was NOT the first design considered. An early-insert-a-name-only-row-then-UPDATE-at-submit
approach was drafted and discarded: it silently rewrites "Suivant inserts the shop" into "Suivant
updates the shop" (relitigating the brief's own ruling), and it reopens exactly the duplicate-shop
danger `owner-shop.ts` warns about — a user who claims a name and abandons before finishing would
hold a `shops` row while still `seller_type = null`, indistinguishable from someone who never
started, so a second attempt claims a second name and a second row. Insert-once-at-submit removes
that window entirely.

**Ordering inside `createShopAction`: `seller_type` UPDATE first, `shops` INSERT second — not the
reverse.** If the shop insert happens first and the `seller_type` UPDATE fails afterward (age gate,
§7c), the account is left holding a `shops` row while still reading as consumer — a state nothing
in the app currently handles and that risks a redirect loop between `/devenir-vendeur` (sends a
non-shop_owner back to G2) and this route's own guard (§7d, sends a shop-holder away from G2).
Flipping `seller_type` first means the only way a shop row exists without a role flip is if the
INSERT itself fails (name taken) — a state `require-seller.ts` already names and handles: "a
shop_owner who never completed G2 … not a redirect: G4 renders its own 'create your shop' state, and
only G2 can fix it." Landing there is correct behaviour, not a residual bug.

### 7c. `seller_type` — set where, and a gap surfaced by live data

Set in `createShopAction`, in the same action as the insert (per §7b's ordering) — not at any
earlier step. `profiles.seller_type` is self-updatable by the authenticated user
(`GRANT UPDATE (…, seller_type) … TO authenticated`, migration `20260609190755`), and the age-gate
trigger (`enforce_seller_type_age_gate`, same migration) fires on exactly this transition, raising
`23514` for a missing or under-18 `date_of_birth`. That code is caught and mapped to a friendly
field message — it must not surface as a raw 500.

**Gap this PR does not close, surfaced by the live count in §4: 10 profiles are already
`seller_type = 'freelancer'`.** CLAUDE.md's "switching deletes own role content" is not implemented
anywhere in the schema (no trigger touches `freelancer_profiles` on a `seller_type` change,
confirmed by reading `freelancers_skills_services_media.sql` — no such trigger exists), and no
in-repo route exercises the freelancer→shop_owner switch today (`/mon-profil-freelance/creer`,
H2's route, does not exist either). Left alone, a freelancer reaching this form would flip to
`shop_owner` with their `freelancer_profiles` row still live — silently violating "never both" at
the content level even though the `seller_type` column itself can only ever hold one value.

Building the switch-and-delete cascade is out of scope for "G2 step 1" by a wide margin. What ships
instead, because the risk is no longer theoretical: **the route guard in §7d also blocks an existing
`freelancer`**, rendering `AlreadyHaveRole` with copy explaining role-switching isn't available yet,
rather than letting the account enter a silently inconsistent state. `/devenir-vendeur` itself has
this same gap upstream (its guard only checks for `shop_owner`, §"page.tsx:27") and is not touched
here — one page, one PR.

### 7d. Route guard — keyed on shop existence, not on `seller_type`

```
has an existing shop?        → redirect /tableau-de-bord-vendeur (not /ma-boutique — roles.ts:71
                                 records that path "has never existed")
seller_type === 'freelancer' → render AlreadyHaveRole (§7c)
otherwise (null OR
  shop_owner-with-no-shop)   → render the form
```

The middle branch is why this can't just be `requireShopOwner` run backwards: a `shop_owner` with
no shop (an abandoned §7b attempt where the insert failed, or an account seeded directly) is a
legitimate retry state per `require-seller.ts`'s own comment — it must reach the form, not bounce.

## 8. Breakpoint plan

Shell facts (`AppShellClient.tsx`): sidebar `hidden lg:block` (240px, appears only ≥1024), main
padding `px-4` (16px, <768) → `md:px-8` (32px, ≥768). Content width uses the D1-established
site-wide scrollbar constant (~15px) where a vertical scrollbar is present.

| viewport | sidebar | padding | available content width | column width (`min(760, available)`) |
|---|---|---|---|---|
| 375 | none | 16×2 | 375−32−15 = 328 | 328 (stacked, full-width fields) |
| 1024 | 240 | 32×2 | 1024−319 = **705** | 705 |
| 1152 | 240 | 32×2 | 1152−319 = 833 | 760 (caps) |
| 1279/1280 | 240 | 32×2 | 960/961 | 760 (caps) |
| 1366, 1440 | 240 | 32×2 | 1047, 1121 | 760 (caps) |

Column is `mx-auto w-full max-w-[760px]` — caps at 760 once available width clears it (~≥999,
`760+319`), fluid below. Because every field inside `box` is `w-full`, none of D1's rigid-track
math applies below the cap: fields simply narrow, no track can overflow its parent.

**One region genuinely is a responsive risk, with no frame to measure it from: the footer.**
`555:37274` draws a full-bleed 288px secondary button and a 91px "Suivant" button with `justify-`
edges at 1200px of room. At 375, available width inside the footer's own 32px inset is
`375−64 = 311` — a bare **288+91 = 379** would already overflow before even accounting for the gap
between them. No 375 frame exists to resolve this from Figma, so the build uses an inferred rule:
stack the footer buttons full-width (`flex-col gap-3` below `sm:`, `flex-row justify-between`
at/above), primary ("Suivant") on top. Logged as an inferred decision, not a measured one.

**`avatar-ring` overflows its own field by 14px on the vertical axis** (`y=-14`, §2a) — `field-logo`
must not clip with `overflow-hidden`.

**Stepper active/future styling is unmeasured** — fills live inside the step `Frame`/text nodes,
which `get_metadata` does not expand (same limit as every instance-internal read in this doc). Built
to the in-repo convention (step 1: filled `brand-blue-600` circle, white numeral; step 2: outline
circle, muted numeral/label; connector `border-subtle`) rather than a second Figma call.

## 9. Component inventory

| region | reuse | note |
|---|---|---|
| Nom (0/100), Description (0/2000) | `Input` / `Textarea`, both already have `counter` (`input.tsx:45`, `textarea.tsx:30`) | zero new counter UI |
| Ville | native `<select>`, `ProductRequestForm.tsx`'s `selectField` class + `GOVERNORATES` | no ui/Select exists in code yet (Figma-only per memory) |
| Avatar preview (logo) | `ui/avatar.tsx`, mirrors `AvatarUploadCard.tsx`'s hidden-input + button pattern | `2xl`-adjacent custom size (measured 120px matches `2xl`) |
| Banner drop-zone | new, route-local — closest precedent is `ImageUploadGrid`'s empty-state dashed zone, but the measured anatomy (icon+button+caption, centred, no drag grid) is its own layout | route-local per the rule (first consumer) |
| Stepper (Bases/Configuration) | new, route-local | no `HorizontalStepper` exists in code anywhere yet, despite the Figma-only memory note naming one — this is the first real consumer |
| `normalizeShopLogo` / `normalizeShopBanner` | thin wrappers over `normalizeAvatar`, own edge constants (ruling 4) | `SHOP_LOGO_MAX_EDGE` mirrors `AVATAR_MAX_EDGE`'s reasoning (largest known render ≈120px here); `SHOP_BANNER_MAX_EDGE` mirrors `PRODUCT_MAX_EDGE`'s (full-width content image) |

## 10. Field gap — settable today?

| field | settable? | evidence |
|---|---|---|
| Nom (unique) | ✅ after §6's migration | `shops.name`, now `UNIQUE` |
| Ville | ✅ | `shops.city`, `GOVERNORATES` |
| Description (min 50) | ✅ | `shops.description`, app-layer `min(50)` (no DB length CHECK exists or is requested) |
| Logo / banner | ✅ after §6's SELECT policy | `shops.logo_url` / `banner_url`, currently 0/1 rows populated |
| `seller_type` flip | ✅ | see §7c |

Everything G2 step 1 needs already exists on `shops` except the two additions in §6.

## 11. Verification results (2026-08-11)

Built at `src/app/ma-boutique/creer/` (page + `actions.ts` + `_components/{CreateShopForm,Stepper,
LogoField,BannerField}.tsx`). Verified with a one-off CDP harness (same raw-headless-Chrome
technique as `scripts/vrt/capture.mjs`, no Playwright) driving the real dev server end to end, plus
a service-role SQL read after each run — not a mock. Script deleted after use; not part of the repo.

**Real user creation, FR.** Fresh consumer → filled name/city/description, attached a real JPEG to
both logo and banner → submitted. Server log confirms three sequential actions
(`createShopAction` 865ms → `uploadShopLogoAction` 2.5s → `uploadShopBannerAction` 1.2s) →
redirected to `/tableau-de-bord-vendeur`, which rendered "Bienvenue, Boutique E2E FR 👋". SQL read
confirmed `shops` row with correct name/city/description, `logo_url`/`banner_url` both populated,
`profiles.seller_type = 'shop_owner'`.

**Logo/banner decode forensics (#122 pattern).** Fetched both stored objects and ran
`sharp().metadata()`: logo → `webp, 512×512, hasProfile:false` (EXIF stripped, exactly
`SHOP_LOGO_MAX_EDGE`); banner → `webp, 1024×1024, hasProfile:false` (source was already 1024,
`SHOP_BANNER_MAX_EDGE=1280` correctly did not upscale). Both decode cleanly — the integrity check
this PR's SELECT policy exists to support is confirmed live, not just reasoned about.

**AR pass.** Rendered fully in Arabic (`أنشئ متجري`, no French leak). **Both character counters
confirmed safe**: typing produced `"20/100"` and `"140/2000"` in the live DOM — no digit/slash
reversal. This durably answers the concern raised before building: D1's known RTL bug
(`reference_rtl_numeric_run_reversal`) was specifically the `"N / N"` pattern *with spaces*, where
the neutral spaces pick up the RTL run's direction. `Input`/`Textarea`'s counter renders
`{count}/{max}` with no spaces, and it is not affected — measured, not inferred from the earlier
bug's mechanism.

**Case-insensitive uniqueness (founder's revision).** Seeded a shop named "Collision Target Shop",
then submitted "collision target shop" (different case) as a second user: stayed on the form,
showed "Ce nom de boutique est déjà pris.", and — the load-bearing check — `seller_type` was
confirmed **still `null`** for that user. This proves the ordering in §7b/7c: the pre-check runs
and rejects *before* the `seller_type` flip, so a taken name never touches the role.

**Freelancer guard.** An account seeded `seller_type = 'freelancer'` hit `AlreadyHaveRole` with the
new copy ("Vous êtes déjà freelance sur Servyou…") and created no shop.

**Existing shop_owner guard.** An account with a pre-existing shop was redirected straight to
`/tableau-de-bord-vendeur` on landing — never saw the form, per §7d's shop-existence key (not
`seller_type`).

**Breakpoint overflow sweep** — `document.documentElement.scrollWidth − clientWidth` at each
required width, FR and AR, `behavior:'instant'` scroll-to-origin before measuring:

| width | FR | AR |
|---|---|---|
| 375 | 56px | 53px |
| 1024 / 1152 / 1279 / 1280 / 1366 / 1440 | 0 | 0 |

**The 1024–1440 result confirms §5/§8's prediction: zero overflow, no D1-class grid bug.** The 375
number is real but **not this page's** — a DOM sweep for the widest offending elements at 375
returned the SAME four elements (topbar `UserMenu` avatar/button, `right: 431` against
`clientWidth: 375`, a 56px shell overflow) on `/ma-boutique/creer`, on the already-shipped
`/tableau-de-bord-vendeur`, and on `/marche/produits` — identical class names, identical overflow
amount. This is a pre-existing defect in the v2 shell's `Topbar`/`UserMenu` (untouched by this PR),
not something introduced here. Per the "once built, stays built" rule this is logged, not fixed:
fixing a shared shell component used by every authenticated page is a different PR's blast radius.
**This page's own content contributes zero overflow at every measured width, including 375.**

Screenshots (FR/AR × all 7 widths) confirm visually: the footer's `flex-col-reverse` /
`sm:flex-row` rule (§8's inferred, unmeasured decision) stacks correctly with "Suivant" on top on
mobile and mirrors correctly under `dir="rtl"` at desktop (secondary start / primary end in both
directions, via logical `justify-between`, no hardcoded left/right). The avatar-ring's 14px
vertical overflow renders exactly as measured, unclipped, at every width tested.

**Not independently re-verified this pass:** the exact `require-seller.ts` "shop_owner with no
shop" retry path (name pre-check races a concurrent insert) — covered by the collision test's
*mechanism*, not by a literal race; and the age-gate `23514` friendly-message path — no test user
was seeded under 18, since `createUser`'s DOB is a script parameter, not exercised in this pass.
Both are straightforward re-derivations of already-shipped, already-tested code paths
(`enforce_seller_type_age_gate`, `resolveOwnedShopId`), not new logic this PR wrote.
