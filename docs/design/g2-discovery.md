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

---

# /ma-boutique/creer/configuration (G2 step 2 — Configuration) — discovery record

**Provenance.** 2026-08-11, same day as step 1. **Calls spent: one** — a single `get_metadata` read
of `556:37583` ("box"), file `jDNjJ8D1gnXiW7Ry3GkN4U`, per the brief's budget. The page shell
(topbar/sidebar/column/footer geometry) is NOT re-measured — it's the same wizard shell step 1
already measured (§2, §8), and this frame (`556:37564`, 824×1369) is Figma's own hug-cropped
per-step artboard: `box` returns at local `x=32`, and `32+760+32=824` — the same 760px column,
32px gutter, just packaged as its own top-level frame instead of nested in a 1200-wide "right"
panel. Stepper (`556:37566`) and footer (`556:37605`) were **not** read this pass — see §13.

## 12. The box (`556:37583`, 760×1027) — 📐 MEASURED

```
box 760×1027 (24px padding all sides, closes exactly: 24+979+24=1027)
  subline @(24,24) 712×21  "Ces réglages sont facultatifs. Vous pouvez les définir maintenant ou plus tard."
  accordion-group @(24,61) 712×942   (gap 16 from subline; 61-24-21=16)
    acc-type        712×66   collapsed, no body drawn
    acc-livraison   712×401  @y90  (gap 24)  — header 66 + body 335
    acc-paiement    712×337  @y515 (gap 24)  — header 66 + body 271
    acc-categories  712×66   @y876 (gap 24)  collapsed, no body drawn
```
`66+24+401+24+337+24+66 = 942` ✓ — exactly 4 sections, uniform 24px gap, no 5th section fits.

**⚑ Every accordion also carries a hidden (`hidden=true`) 1136×1079 "body" instance** —
`port-rows`/"Ajouter un projet"/"Lien portfolio externe" copy, i.e. H6/H7's freelancer *portfolio*
accordion body, pasted onto all four sections identically (same node shape, same copy, same
hidden=true). This is Figma authoring debris from cloning an H-side accordion component, not part
of this design — not built, not counted as a 5th region anywhere in this doc.

### 12a. `acc-livraison` body (712×335) — MEASURED

```
field "Mode de livraison"        664×119  — label(17) + gap8 + 3 Radio instances (166×26/174×26/150×26, gap 8)
field "Ma société de livraison"  664×172  — label(17) + gap8 + Select-Trigger(664×97) + gap8 + caption(2 lines, 42)
  caption verbatim: "Options : First Delivery · Aramex · Droppex · Navex · Best Delivery · Intigo ·
                      Mes Colis · La Poste (Rapid-Poste) · Livraison personnelle · Autre"
```
Per ruling 2, "Ma société de livraison" is built as free text + `<datalist>` of those ten literal
names, not a real Select — so the 97px trigger height (which would encode an open dropdown panel,
never resolved from `get_metadata`'s instance-opacity limit anyway) is moot; the field renders at
Input's standard 44px.

### 12b. `acc-paiement` body (712×271) — MEASURED

```
text (measured verbatim) @y4  664×21
  "Le paiement à la livraison (COD) est activé par défaut. Ajoutez d'autres options si vous les acceptez."
checks @y41  664×206 — 6 Checkbox instances, gap 10, widths 431/164/55/89/71/67
```
Six checkboxes = exactly `PAYMENT_METHODS.length` (cod/bank_transfer/d17/flouci/konnect/other). The
first (431px, widest) is cod — consistent with ruling 3's locked/disabled state needing the longest
label+caption. Built in `PAYMENT_METHODS` array order.

### 12c. `acc-type` / `acc-categories` bodies — UNMEASURED (headers only, no body drawn)

Both collapsed in this frame; `get_metadata` returned zero body content for either. Everything
inside them below is **inferred**, not measured — flagged the same way step 1 flagged its own
unmeasured stepper fills (§8).

## 13. What this PR does NOT re-measure, and why that's safe

- **Footer (`556:37605`) — not read.** Step 1's *own measured record* (§2) already states this
  frame's footer: `Button (secondary, left) 288×40` + `nav` containing `Button "Précédent" —
  hidden=true` + `Button "Suivant" 91×40`. Absent a second call, step 2's footer is built **identical
  to step 1's measured footer** — secondary start, primary end, no Précédent — rather than assumed
  to differ. If the founder wants a working "back to Bases" control, that's a second `get_metadata`
  call on `556:37605` plus a change to step 1's own shop-exists guard, which today bounces any
  shop-holder straight to `/tableau-de-bord-vendeur` — out of scope here.)
- **Stepper (`556:37566`) — not read.** Reused verbatim: same two steps ("Bases"/"Configuration",
  already in `shop.create.step1_label`/`step2_label`), same component. Step 1 renders `active`/
  `upcoming`; step 2 needs a third **`done`** state for step 1's own circle (filled + checkmark,
  inferred — no Figma read backs this glyph choice, same inferred-not-measured category as step 1's
  own active/upcoming fills, §8).
- **Page header (breadcrumb/H1/subline) — not read.** Reused verbatim from step 1
  (`shop.create.page_title`/`page_subtitle`/`crumb_devenir`/`crumb_current`) — same wizard, same
  framing copy, only the Stepper's active step and the box content change between the two screens.

## 14. The two orphan fields — `working_hours` / `location_detail`

The brief lists seven settable fields; the frame draws four accordion bodies. `shop_type`,
`delivery_setup`, `preferred_carriers`, `shop_payment_methods`, and `shop_categories` account for
five of the seven boxes across acc-type/acc-livraison/acc-paiement/acc-categories, leaving
`working_hours` and `location_detail` with no drawn home — and §12's arithmetic (942 exact) proves
there is no undrawn fifth accordion for them to occupy.

**Resolved: both live inside `acc-type`'s undrawn body**, alongside the `shop_type` control.
`shop_type` (physical/online_only/dropshipper) is the one question in this form that determines
whether an address or opening hours are even meaningful to the buyer — a `dropshipper` or
`online_only` shop may have neither — so grouping "what kind of shop is this, and if it has a
physical presence, when/where" reads as one coherent section, not three unrelated ones. This is
also the most likely reason the pre-seeded i18n block (§15) already carries
`field_working_hours`/`hint_working_hours` and `field_location_detail`/`hint_location_detail`
sitting right next to `field_shop_type` — the keys were prepared for exactly this grouping.
**Inferred, not measured** — logged the same way as everything else in §12c.

`acc-type`'s body, built: `shop_type` (native `<select>`, see §15) → `working_hours` (`Input`,
`field_working_hours`/`hint_working_hours`) → `location_detail` (`Input`,
`field_location_detail`/`hint_location_detail`), `gap-5` (20px), matching step 1's own field-to-field
spacing convention inside its box.

## 15. i18n — reuse vs. new, and the rule applied

The brief's twelve `boutique.shop_type_*` / `delivery_setup_*` / `payment_method_*` keys (verified
present in **both** `fr.ts` and `ar.ts`, parity confirmed — 35/35 `boutique.*` config-shaped keys
match count across both files) are consumed via `shop-config.ts`'s existing `shopTypeLabelKey` /
`deliverySetupLabelKey` / `paymentMethodLabelKey` helpers, unchanged.

Beyond those twelve, a second pre-seeded block already sits in `fr.ts`/`ar.ts` (`field_shop_type`,
`field_delivery_setup`, `field_working_hours`, `field_location_detail`, `field_preferred_carriers`,
`field_payment_methods`, `field_category_specialties`, matching `hint_*`/`placeholder_*`, and
`action_create`/`action_save`) — unconsumed by any code today (grep confirms zero call sites), but
too precisely shaped for this exact page to be coincidental. `action_create` = **"Créer ma
boutique"**, verbatim what the brief specifies for this page's own final CTA.

**Rule applied where pre-seeded copy and Figma's measured copy disagree:** measured text wins where
Figma actually drew it; pre-seeded keys win where Figma drew nothing (§12c's two collapsed
sections). Concretely:
- `field_shop_type` = "Type de boutique" happens to match the measured header text exactly (minus
  the dynamic "(optionnel)" suffix, dropped everywhere — see badge note below) → reused as-is.
- `field_delivery_setup` = "Mode de livraison" matches §12a's measured field label **verbatim** →
  reused.
- `field_preferred_carriers` = "Transporteurs préférés" does NOT match the measured "Ma société de
  livraison" — reused anyway (existing-key-over-new-string), logged as a wording deviation from the
  literal Figma text.
- `hint_preferred_carriers` = "Ex : First Delivery, Aramex, Mylerz, Best Delivery" (short, existing)
  is the **visible caption**; the full ten-name **measured** list (§12a) becomes the `<datalist>`'s
  suggestion options instead — both keys used, for two different jobs, nothing dropped.
- `placeholder_shop_type` = "— Sélectionner —" is the tell that `shop_type` was originally drafted
  as a select, not radios — used as the empty option of a native `<select>` (mirrors step 1's own
  Ville field, `ProductRequestForm.tsx`'s `selectField` class), since acc-type's body was never
  drawn and this is the only direct evidence of intended control type for that field.
  `placeholder_delivery_setup` (same shape) goes **unused** — `delivery_setup` WAS measured as 3
  radios (§12a), and measured content overrides an unmeasured placeholder's implied assumption.
- `field_payment_methods` = "Modes de paiement acceptés" does not match the measured header "Moyens
  de paiement" closely enough to reuse as the section title without contradicting §12's own text —
  a **new** key is added for the header; `field_payment_methods` is logged unused-for-now (candidate
  for G3's future edit page, which was very likely this block's other intended consumer).
- `field_category_specialties` = "Spécialités" — same call: doesn't match measured "Catégories de la
  boutique" closely enough; a **new** section-header key is added, this one logged unused-for-now.

**New keys added** (none of the above covers): `boutique.config.badge_optional` / `badge_complete`
(the accordion StatusPill text — genuinely new UI chrome, not a duplicate of anything), `section_
livraison` / `section_paiement` / `section_categories` (measured header text, minus "(optionnel)"),
`cod_note` (§12b's measured instructional sentence, verbatim), `cod_locked` (ruling 3's "verrouillé
— défaut universel", paraphrased, no measured source), and `shop.create.saving` ("Enregistrement en
cours…" — step 1's `submitting` = "Création en cours…" reads wrong for an UPDATE, which is all step
2 ever does).

## 16. Badge computation (ruling 4) — one rule, not four

**Complet iff the owner has supplied at least one value the owner actually controls; Optionnel
otherwise.** Applied per section:

| section | Complet when |
|---|---|
| acc-type | `shopType \|\| workingHours \|\| locationDetail` (any of the three) |
| acc-livraison | `deliveryMode \|\| carrierText.trim()` — the exact "delivery mode set, carrier empty" case ruling 4 flags resolves to Complet, since deliveryMode alone is a real owner-supplied value |
| acc-paiement | `paymentMethods.size > 1` — i.e. more than just the locked `cod`. cod is not owner-controlled (ruling 3: written regardless, un-uncheckable), so it cannot count toward "the owner configured this section" |
| acc-categories | `categoryIds.size > 0` |

Computed from **live client state** on every render, not from the server-loaded initial values —
so unchecking the last extra payment method flips the badge back to Optionnel immediately, before
save, not after a round trip.

## 17. Write path — resolved against the advisor's three corrections

1. **`shopId` is never accepted from the client.** Unlike step 1 (which had to hand a freshly
   `.insert()`-returned id to the upload actions because nothing else could name the row yet), step
   2 is a pure update against a shop that's known to exist by the time the page renders — the save
   action re-derives it itself via `resolveOwnedShopId(supabase, user.id)`, same as the page guard.
   Removes a client-supplied-shopId IDOR surface that step 1 never had to worry about.
2. **Unchecking a previously-saved payment method / category must delete its row**, not just skip
   re-inserting it — a naive "insert what's checked" leaves stale rows behind. Both child tables are
   reconciled against their current DB state with the same pure set-diff (`reconcile()`,
   `src/lib/shops/reconcile.ts`, unit-tested — data-integrity logic, must-test per CLAUDE.md):
   `toDelete = previous \ selected`, `toInsert = selected \ previous`. `cod` is unconditionally unioned
   into the selected set before the diff runs (ruling 3).
3. **Free text columns save as `null`, not `''`**, when empty — trimmed server-side, matching
   `working_hours`/`location_detail`/`preferred_carriers`'s nullable-text shape and keeping the
   badge rule (§16, which reads `''` as falsy either way, but the DB should reflect "never set" as
   NULL, not an empty string) honest with what's actually stored.

`shop_type`/`delivery_setup` are validated with `z.enum(SHOP_TYPES)` / `z.enum(DELIVERY_SETUPS)`
(both already exported from `shop-config.ts`) so no value outside the CHECK constraint's own set can
reach the query.

`categoryIds` gets the same treatment `shop_categories` has no CHECK for: `categories` is one flat
table shared by products/services/job-posts/shop_categories (`product-categories.ts`'s own header),
so a UUID-shaped-but-wrong-kind id would pass `z.string().uuid()` and the FK constraint without
issue. The action re-derives the valid set via `getProductCategories()` (product/both kind) and
filters the client's list against it before reconciling — the exact defect class that file's header
already documents being fixed twice on the mission side (#112) and the product side (G6); this is
the shop-config side of the same fix, not a new pattern.

## 18. Guard (ruling 1)

```
resolveOwnedShopId(supabase, user.id)
  ok: true             → render the form (fetch shop row + child tables + category list)
  ok:false, no_shop     → redirect /ma-boutique/creer  (step 1's own guard then decides: form for a
                            consumer/shop_owner-no-shop, AlreadyHaveRole for a freelancer — this
                            route doesn't need to re-derive any of that, step 1 already owns it)
  ok:false, query_failed → throw (mirrors step 1's page.tsx exactly)
```
A direct URL hit with no shop (never completed step 1, or typed the URL cold) lands on step 1's
form, not an error page or a silent redirect to the dashboard — the honest "go create the shop
first" answer. No "already configured, go away" branch exists on the success path: per ruling 5 the
shop is already legitimate with nothing configured, so this route stays reachable indefinitely as
the only current write surface for these seven fields (G3 `/ma-boutique/modifier` does not exist in
code yet — Figma-only per memory), not just during a single onboarding session.

## 19. Step 1 rewiring — the one previous-PR file touched

`CreateShopForm.tsx`'s two submit buttons currently do the identical thing (create shop → redirect
`/tableau-de-bord-vendeur`) because step 2 didn't exist when they were built — `Stepper.tsx`'s own
comment already flags step 2 as "not yet reachable," anticipating this. **Only the primary
("Suivant") button's post-success destination changes**, to `/ma-boutique/creer/configuration`,
disambiguated via `data-intent` + `(e.nativeEvent as SubmitEvent).submitter` (not FormData, which
drops a disabled submitter's pair — irrelevant here since the read happens synchronously at click
time, but the submitter reference is the more direct signal regardless). The secondary ("Enregistrer
et continuer plus tard") button, the Stepper's non-interactivity, step 1's validation, and its image
upload flow are all untouched. Flagged here explicitly for the founder's merge review per CLAUDE.md's
"once built, stays built" rule — this is judged as completing previously-scaffolded intent, not
overriding an architectural decision, but it's a previous PR's file and deserves the explicit call-out.

## 20. Verification note — accordions must be forced open for the overflow sweep

Every section of this page starts collapsed. Measuring `document.documentElement.scrollWidth −
clientWidth` with all four `<details>` closed would only ever exercise the box's collapsed-header
chrome (already proven zero-overflow by step 1's identical box/column geometry) and silently skip
every field this PR actually adds. The verification pass force-opens every `<details>` (`el.open =
true`) before each measurement. Result: **0px at every FR/AR width from 1024–1440; 56px FR / 53px AR
at 375** — matching step 1's already-logged figures for those exact same numbers (g2-discovery.md
§11) to the pixel, not a new regression.

**Screenshot confirms it's the same defect, not a new one, and explains the numbers visually.** At
375/AR, the topbar avatar renders detached near the document's far-left edge over a black void —
alarming on first look, but it's exactly the mechanism §11 already attributed to `Topbar`/`UserMenu`:
a `right:` offset computed against the wrong containing-block width. With `scrollWidth` at 428
(375+53) and the logged `right: 431`, `428 − 431 ≈ −3px` places the avatar right where the
screenshot shows it. Same broken element, same arithmetic, this page just happens to be the first
one in this codebase's history to screenshot it rather than only sum it. Not fixed here — still a
shared-shell change, still a different PR's blast radius, per §11's own ruling.

---

# /ma-boutique/creer/succes (G2 success — "Boutique créée") — discovery record

**Provenance.** 2026-08-12. **Calls spent: one** — a single `get_metadata` read of `556:38330`
("box"), file `jDNjJ8D1gnXiW7Ry3GkN4U`, per the brief's budget. Only the box's children came back;
the parent frame `556:38328` (824×484) was not itself expanded, so nothing here confirms whether the
design intends `AppShell` chrome (topbar/sidebar, like step 1/2) or a chromeless centered card (like
E2/K1-K4). Logged as an open question in §22, not assumed.

## 21. The box (`556:38330`, 760×370) — 📐 MEASURED

```
box 760×370  @ (32,82) inside the 824×484 frame  — 32px side gutters, ASYMMETRIC vertical
             (82 top, 484-82-370=32 bottom) — consistent with a page that has its own header
             region above the card (AppShell topbar) rather than a self-centered modal
  Frame (icon ring) 96×96 @ (332,48)         — centre x = 380 = 760/2 exactly (centred)
    icon-check-circle 48×48 @ (24,24)         — centred inside the 96×96 ring
  H1 "Votre boutique est créée !" 297×30 @ (231.5,160)   — centre x = 380 (centred), gap 16 from icon
  subline 664×52 @ (48,206)                              — centre x = 380 (centred), gap 16 from H1
    verbatim: "Bienvenue parmi les vendeurs Servyou. Ajoutez votre premier produit pour commencer
                à vendre."
  Frame (button row) 491×48 @ (134.5,274)                — centre x = 380 (centred), gap 16 from subline
    Button 235×40 @ (0,8)
    Button 244×40 @ (247,8)                               — gap 12 between the two buttons
```

**Exactly two buttons, no third.** The "add your first product" content the brief describes is
entirely inside the 664×52 subline text node — there is no separate button, link, or third `Frame`
child anywhere in the metadata for that idea. §23 below reports this as drawn, per the brief's own
instruction not to improve on it.

Button labels themselves are not readable from `get_metadata` (same instance-opacity limit every
prior page in this doc hit — §2c, §12c) — taken from the brief's own copy: "Voir ma boutique
publique" (235px, first/start) and "Aller à mon tableau de bord" (244px, second/end).

## 22. Shell or chromeless — INFERRED at build time, not re-measured

Built with `AppShell` (see §23 build note below). This section's original open question stands as
the record of why it was genuinely ambiguous from the one `get_metadata` call spent; the choice
itself was made during build, not resolved by a second Figma read.

Not resolved by this pass's one call. Two precedents pull in different directions:
- Step 1 and step 2 (`ConfigurationPage`, this same file's §2/§11) both render inside `<AppShell>`
  — this screen is reached by an already-authenticated shop owner mid-flow, same as those two.
- E2 ("Demande envoyée") and K1-K4 are shell-less centered cards (memory:
  `project_figma_e2_confirmation`, `project_figma_k1k4_system_pages`) — the closest content-shape
  precedents (icon + H1 + line + CTA row) in the registry.

The frame's own total width (824) is far narrower than step 1's 1200-wide "right" panel measured in
§2, and draws no Stepper/breadcrumb — both consistent with a standalone artboard cropped to its own
card content rather than nested inside the same 1200-wide shell frame. That is circumstantial, not
a `get_metadata` read of the parent confirming shell vs. no-shell either way.

## 23. Route, guard, D3 link, and the third-action question — reported, not built

See the conversation for the full reasoning; summarized here for the record:

- **Route recommended:** `/ma-boutique/creer/succes`, sibling of `configuration`, own dedicated page
  — not a query param on `/tableau-de-bord-vendeur`. The frame is its own compact artboard (§22),
  not a variant of G4's action-center grid; overlaying it behind a query flag would mean branching
  G4's own render on unrelated onboarding state.
- **Guard recommended:** reuse `resolveOwnedShopId` verbatim, identical to `ConfigurationPage`'s own
  guard (this file, `page.tsx:36-44`) — `ok:false` → redirect `/ma-boutique/creer`; `ok:true` →
  render. No new "already seen this" state. Configuration itself is optional end-to-end (§16 — every
  section can be `Optionnel` and the badge rule never requires `Complet`), so shop existence is the
  only real precondition; there is no "configuration finished" flag to key a stricter guard on even
  if one were wanted.
- **Revisit/bookmark handling recommended:** accept indefinite reachability once a shop exists, same
  policy §18 already accepted for `configuration` itself ("this route stays reachable indefinitely
  … not just during a single onboarding session"). Nothing on the page is sensitive, destructive, or
  goes stale — "you have a shop, here are your two links" stays true forever. A true one-time view
  would need a new persisted flag (e.g. a `shops` timestamp column) with no existing precedent
  anywhere in this doc's three pages; not proposed unless the founder wants it.
- **Wiring recommended:** mirror §19's own precedent exactly — only the *primary* submit button
  ("Créer ma boutique") in `ConfigurationForm.tsx` redirects to the new route; the secondary
  ("Enregistrer et continuer plus tard") keeps redirecting to `/tableau-de-bord-vendeur` unchanged,
  same asymmetry §19 already applied to step 1's two buttons and for the same reason — a
  save-and-defer click is not a completion event.
- **No `src/app/ma-boutique/creer/layout.tsx` exists.** `succes` cannot inherit a shared guard from
  step 1 or step 2 the way a nested layout would provide — it needs its own explicit
  `resolveOwnedShopId` check, written the same way `configuration/page.tsx` writes its own.
- **D3 link — reported as blocking at the time this section was written.** See §24 below for the
  ruling.

## 24. The D3 link — RULED 2026-08-12

Ships `disabled`, matching D1/C1's non-live treatment (not the G4 dashboard's already-broken live
link) — see the conversation for the three-surface audit (`ProductDetail.tsx`/D1's two spans,
`ProduitsLensToggle.tsx`/C1) and `docs/follow-ups.md`'s existing 🔴
`tableau-de-bord-vendeur:83` entry ("Voir ma boutique" is a live 404) on the fourth surface (G4).
Logged as the 4th entry against that same 🔴 item — line numbers not cited here since this same
edit inserted new content into that file, which would immediately go stale.

`ProductDetail.tsx:35`'s own comment cites `ServiceDetail.tsx:232` as carrying "the same
treatment" — checked while auditing this and found stale: that line is D2's report-line today, and
D2 (service detail, freelancer-owned) has no shop/D3 concept at all, services don't belong to
shops. Not a real fifth surface; the comment is drift, logged here and in `follow-ups.md` so it
isn't re-cited by a future pass.

The D3 URL-shape question this audit also raised (`[id]` vs `[slug]`) turned out to have been
already ruled by the founder but never recorded — now written down in `follow-ups.md`'s own D3
URL-shape entry as resolved: bare `[id]` for all four public-profile-style routes (D1–D4).

## 25. Verification results (2026-08-12)

Built at `src/app/ma-boutique/creer/succes/page.tsx`. `ConfigurationForm.tsx`'s primary submit
rewired (data-intent="create") per §23's wiring recommendation. Verified with a one-off CDP harness
(same technique as g2-discovery.md §11/§20, no Playwright) against the real dev server — two
service-role-seeded fixtures (`owner`, a shop_owner with a live `shops` row; `noshop`, a plain
consumer), real `/connexion` sign-ins, real button clicks. Fixtures and script deleted after use.

**Guard.** `noshop`, signed in, direct hit on `/ma-boutique/creer/succes` → landed on
`/ma-boutique/creer` (redirected, not rendered). `owner`, direct hit on the same URL → rendered
(no redirect) — confirms §23's guard recommendation (`resolveOwnedShopId` reused verbatim) behaves
exactly as designed for both branches.

**Real walkthrough.** `owner` navigated to `/ma-boutique/creer/configuration`, clicked the button
carrying `data-intent="create"` ("Créer ma boutique") — landed on `/ma-boutique/creer/succes`.
Confirms the primary-submit-only rewiring (§23/§19 mirror) actually fires end to end, not just by
reading the diff.

**Content.** Screenshot confirms the built card matches §21's measured geometry: green check-circle
chip, H1, subline, and the two buttons in the measured order — "Voir ma boutique publique" rendered
`disabled` (muted, per the D3 ruling) and "Aller à mon tableau de bord" rendered as the live primary
CTA.

**Breakpoint overflow sweep** — `document.documentElement.scrollWidth − clientWidth` at every
required width, FR and AR, `behavior:'instant'` scroll-to-origin before measuring:

| width | FR | AR |
|---|---|---|
| 375 | 56px | 53px |
| 1024 / 1152 / 1279 / 1280 / 1366 / 1440 | −15px | −15px |

**The 375 numbers are the identical, already-logged `Topbar`/`UserMenu` shell defect** (g2-discovery
§11/§20 — same 56/53 figures, to the pixel, on `/ma-boutique/creer` and `/ma-boutique/creer/configuration`
already). Not a new regression; this page's own content contributes zero additional overflow. The
1024–1440 figures are **negative**, which means `scrollWidth` came back *smaller* than `clientWidth`
— the card (`max-w-[760px]`, centred) is comfortably narrower than the viewport at every one of
those widths, so there is no scrollbar and nothing to overflow. Genuinely zero horizontal overflow,
not a sign worth chasing.

**AR pass.** `document.documentElement.dir === 'rtl'` confirmed live, H1 read back as
`"تم إنشاء متجرك!"` — no FR leak. Screenshot confirms the button row mirrors correctly: in FR the
disabled "Voir ma boutique publique" (drawn first/start in the frame, §21) renders on the visual
left and the primary "Aller à mon tableau de bord" on the right; in AR the same DOM order renders
disabled-left flips to disabled-right, primary-left — a straight logical-properties mirror, no
hardcoded left/right anywhere in the markup. This matches the wizard's own established convention
(step 1/2's footer: secondary at the reading-direction start, primary at the end, §2/§13) rather
than an unexamined default — confirmed intentional, not just observed. No digit/counter content
exists on this page, so the RTL numeric-run class of bug (`reference_rtl_numeric_run_reversal`) has
no surface to reproduce on here.

**Accessibility follow-up (2026-08-12, second pass).** The disabled "Voir ma boutique publique"
button initially shipped with only a `title` tooltip for the disabled reason — hover-only, and a
`disabled` native button is removed from the tab order, so no keyboard/AT user could reach it.
Corrected to match `ProduitsLensToggle.tsx`'s own precedent for the identical problem: `aria-
disabled="true"` alongside the native `disabled`, plus a visible "Bientôt" badge rendered as a
child of the button so the reason is part of the accessible name, not only the title attribute —
per `docs/design/accessibility.md`'s Button spec ("aria-disabled when disabled"). A live DOM
re-check was queued in the same CDP pass as the secondary-submit check below and hit the same
outage before it could run (see that paragraph) — confirmed instead by reading the built JSX
directly: `aria-disabled="true"` and the badge span are unambiguously present in
`src/app/ma-boutique/creer/succes/page.tsx`, so the accessible text is "Voir ma boutique publique
Bientôt" by construction.

**Deliberate divergence from §21's measured 235px width.** Adding the "Bientôt" pill as a child
grows the button's intrinsic width past the measured 235px (the row is `whitespace-nowrap`, so it
grows rather than wraps) — a11y-driven, not a fidelity slip, and the same category of divergence
`ProduitsLensToggle.tsx` already logs for its own invented "Bientôt" badge against `578:42513`
(which draws the segment with no badge at all). **Not re-swept after adding it** — the a11y fix
landed after the live overflow pass above, and the same CDN outage blocked a second live sweep.
Reasoned instead of measured: the button row sits inside a 760px card with real slack at every
desktop width (§8), and at 375 the row stacks `flex-col` full-width (this page's own footer rule,
mirroring step 1/2's), so a wider first button still spans the same row width rather than pushing
past it. Low-risk, but logged as reasoned, not verified, per this doc's own standard for
distinguishing the two.

**Secondary submit ("Enregistrer et continuer plus tard").** Confirmed by code inspection: it
carries no `data-intent` attribute, so `ConfigurationForm.tsx`'s ternary (`intent === 'create' ?
'create' : 'draft'`) falls through to `'draft'` and still redirects to `/tableau-de-bord-vendeur`
— only the primary submit's destination changed; this is the exact same fallback shape
`CreateShopForm.tsx`'s own `data-intent="next"` pattern already uses in production (§19). A live
CDP click-through of this specific branch was attempted but blocked by a Google Fonts CDN outage
mid-session — the exact `fonts.gstatic.com` Cairo `.woff2` path this app requests 404s directly
from Google right now, confirmed with a bare `curl`/`Invoke-WebRequest` outside the app entirely
(not a bug in this PR, this repo, or the dev server). Logged here rather than silently claimed:
the guard, the create-branch walkthrough, the overflow sweep, and the AR pass (above) all completed
live before the outage started; the secondary-submit branch and the a11y fix are confirmed by
code/DOM inspection, not a second live pass. **Superseded by §26** — the CDN recovered and the
blocked branch was re-run live.

## 26. The blocked live pass, completed (2026-08-12, after §25's outage cleared)

Google's Fonts CDN was reachable again (`fonts.gstatic.com` returned real `200`s for Cairo's own
woff2 files on direct `curl`), but the **dev server's own Turbopack cache still held the failed
CSS module from mid-outage** — `.next/dev/static/chunks/…cairo…css` had baked in dead
`fonts.gstatic.com` URLs (different hashes than the live CSS now serves), so every route kept
500ing (`Module not found: …/internal/font/google/font`) until `.next` was deleted and the dev
server restarted. Worth recording as its own finding: **a transient CDN outage during a Turbopack
dev session doesn't self-heal when the CDN recovers** — the broken fetch gets cached, and only a
`.next` clear + restart forces a fresh one. Not a app-code bug; logged as the reasoning behind why
"CDN is back" and "the dev server is healthy" were briefly two different facts.

With a healthy dev server, the three specific items requested were verified against a real
Chromium instance (no Playwright — headless Chrome via `--remote-debugging-port`, driven over raw
CDP with Node's built-in `WebSocket`, same technique as §11/§20), signed in through the real
`/connexion` form as an ephemeral service-role-seeded shop-owner fixture (one auth user + one
`shops` row, `@cdp-g2success.servyou.invalid`, deleted immediately after):

- **`aria-disabled` + visible "Bientôt" badge.** Read the live DOM `outerHTML` of the button:
  `disabled=""`, `aria-disabled="true"`, and `<span>Bientôt</span>` all present, text content
  `"Voir ma boutique publiqueBientôt"` — the badge renders as part of the button's own text, not
  behind a `:hover` state. Re-checked in AR: `aria-disabled="true"` holds and the badge reads
  `"قريبًا"` (the AR translation of "Bientôt"), same construction, `dir="rtl"` confirmed live.
- **Not reachable as an interactive control.** `element.focus()` called directly on the button
  left `document.activeElement` on `<body>`, not the button — a real browser refusing focus on a
  natively `disabled` element, not a `tabIndex` guess. A second, independent check dispatched 8 real
  `Tab` keydown/keyup events from the page body and confirmed focus never landed on it at any point
  in the traversal (it skips straight from the shell's search field to the sidebar's "Paramètres"
  link — visible in the FR screenshot as the focus ring on "Paramètres", not on either success-page
  button).
- **"Enregistrer et continuer plus tard" still falls through to `/tableau-de-bord-vendeur`.**
  Clicked the real button (not simulated via `router.push`) on `/ma-boutique/creer/configuration`
  and landed on `/tableau-de-bord-vendeur` — confirms §19/§23's asymmetric-wiring recommendation
  survived the primary-submit rewiring in this PR's diff, live, not just by reading the ternary.

**One harness-only gotcha worth keeping for the next CDP pass that submits a form on this
codebase**: a `.click()` dispatched too soon after `Page.navigate` can land before Turbopack has
finished hydrating the client component. Neither the `/connexion` `SigninForm` nor
`ConfigurationForm` gives its inputs a `name` attribute (both are fully controlled + JS-submitted
by design), so an unhydrated click falls through to a **native, unhandled form submission** — a
silent GET reload of the same URL with no data, which looks identical to "the button did nothing"
from the outside (same URL, no error banner, no console error) and cost several retries to
diagnose. Not an app bug — SSR paints the button's final text before the client bundle attaches
its handler, which is expected Suspense/hydration behavior — but a harness that clicks immediately
after a route change will intermittently self-defeat on this app. Fixed in the (deleted) one-off
script with a growing settle wait before the first interaction.

