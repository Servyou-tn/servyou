# Follow-ups

Tracked deferrals — work intentionally pushed out of the PR that surfaced it, with
enough context to pick up cold. Each entry: what, why deferred, where it lives, the
trigger to do it.

## Closed decisions — do NOT "fix" these

Settled deliberately, with the reasoning, so a later pass does not read them as defects and
undo them. A closed decision is not a deferral.

### ✅ Orders do NOT snapshot a product image — the 48×48 falling back to its icon is CORRECT

- **Decision (founder, 2026-07-31):** `orders` will **not** get an `item_image_url` column.
- **Why, and this is the whole point:** `item_title` and `unit_price_tnd` are frozen because they
  are **facts about money and identity** — what was bought and what it cost must survive the
  product being edited or deleted. **A thumbnail is decorative.** It is not a fact the order needs
  to be correct.
- **And freezing would not even work.** A frozen URL does not survive the storage object being
  deleted. Snapshotting the path buys a **broken image** (a 404'd `<img>`, or alt text under
  `next/image`) instead of the clean icon placeholder that renders today. That is strictly worse:
  a broken image reads as a bug, an icon placeholder reads as "no photo".
- **So the expected behaviour is:** product deleted → `orders.product_id` goes NULL (existing
  `ON DELETE SET NULL`) → `product_images` rows CASCADE away → the G9 order row renders its
  **icon placeholder** at `_components/OrderActionRow.tsx:64`, while title and price still render
  from the snapshot. **This is the design, not a gap.**
- **Do not** "restore" the thumbnail by adding a snapshot column, and do not copy the image to an
  order-owned path (that doubles stored bytes for every ordered image against the 1 GB cap that
  is the binding storage constraint).
- **Context:** `docs/design/image-storage-discovery.md` §6b. Its §7b trigger analysis
  (`set_order_snapshot` reads scalars, so any future snapshot column needs a correlated subquery
  over `product_images` and must not raise when there is no image) stays valid and is worth
  reading first *if* a snapshot column is ever genuinely justified.

### ✅ The sidebar's Marketplace item is expandable — a deliberate REVERSAL of the 2026-06-27 flat-IA ruling, not drift

- **Decision (founder, 2026-08-15, PR `feat/sidebar-marketplace-and-shell-migration`):** the
  Marketplace item in `sidebar-items.ts` expands to two sub-items (Produits/Services). Clicking it
  navigates to Produits AND expands; clicking Services navigates there and the expansion follows
  the route. This is the ONE exception to the flat, no-nesting sidebar IA the founder locked on
  2026-06-27 (`sidebar-items.ts:17`, "supersedes the example item list in design system Section
  6.1").
- **Why this reverses the ruling rather than violating it:** the 2026-06-27 flat IA assumed a
  visitor could still switch between the Produits and Services marketplace engines some other way.
  That other way — the legacy marche top bar's Produits/Services text-link toggle
  (`MarcheTopBar.tsx`'s `NavTextLinks`) — was retired in this SAME PR, and no cross-engine toggle
  exists anywhere else now (`/marche/services` and `/marche/produits` each keep only their OWN
  local toggle — Services/Freelances and Produits/Boutiques respectively, per the same PR's
  ruling). Once that was gone, the sidebar had to become the thing that moves a visitor between
  the two engines — new information the 2026-06-27 decision didn't have, not a change of mind.
- **Contained, not a general nested-item model:** `SidebarItemDef` gained one optional `subItems`
  field and Sidebar.tsx gained one conditional branch — every other item in every other section is
  still a flat leaf. If a second item ever needs the same treatment, that's the trigger to
  generalize; one exception is not.
- **Do not** read this as license to nest other sidebar items, and do not "simplify" it back to
  flat without first checking whether a cross-engine toggle has been rebuilt somewhere else — if
  one hasn't, collapsing this back to a flat Marketplace link removes the only way to reach the
  Services engine from the sidebar.
- **INFERRED, not measured:** no Figma frame exists for a chevron/expand affordance on the v2 navy
  sidebar (`SidebarItem.tsx` cites `611:45637`, flat-only) and the quota was exhausted before this
  PR. The `ChevronDown` + `rotate-180` treatment (matching `MarcheSidebar.tsx`'s old filter toggle
  and `AccountMenu.tsx`'s dropdown, not a directional `ChevronRight` idiom) is a reasoned choice,
  not a measured one — re-check against a real frame if the quota ever resets.

## Open

### `docs/follow-ups.md` conflicts on every concurrent branch — it needs an append convention

- **What:** this file conflicted **twice in a single session** (2026-07-31), on the same lines, for
  the same reason: every PR inserts its new entries at the **top of `## Open`**, so any two branches
  alive at once both rewrite the identical region. First conflict was moving the image-storage work
  off PR #102's branch; the second was rebasing that branch onto main after #102 merged. Same file,
  same hunk, twice.
- **Why it is worse than an ordinary conflict:** the merge is not mechanical. Resolving it means
  deciding *which entries belong to which PR* — on the first conflict the stash carried #102's five
  entries into a branch that must not contain them, and keeping "both sides" would have silently
  duplicated another PR's follow-ups into this one. A careless `--theirs`/`--ours` is wrong in both
  directions, and the damage (an entry attributed to the wrong PR, or lost entirely) is invisible in
  review because the file is prose.
- **Proposed fix — APPEND AT END, not per-PR sections.** New entries go at the *bottom* of `## Open`.
  Git merges concurrent appends to different tail positions cleanly; concurrent inserts at the same
  head position never merge. Per-PR sections (`## Follow-ups from PR #NNN`) sound tidier but do
  **not** fix it: every branch still edits the same section list at the same place unless each new
  section is appended at the file's tail — at which point the section heading is just decoration on
  top of the append rule. So: append, and let the entry's own text say which PR raised it.
  - Trade-off, stated: newest-last is worse to read than newest-first. Mitigate with a dated
    one-line index at the top if that becomes annoying — an index line is one line, so it still
    collides, but a one-line conflict is trivial where a 60-line prose conflict is not.
  - The alternative that actually removes the problem is one file per entry
    (`docs/follow-ups/<slug>.md`), which cannot conflict at all. Heavier, but worth considering if
    the append convention still bites.
- **Deliberately NOT restructured in the two PRs that hit it** (founder call) — reordering the whole
  file inside a storage PR would bury the change under an unrelated diff, and the restructure wants
  to land when no other branch is mid-flight or it just causes the conflict it is trying to prevent.
- **Trigger:** next time two PRs are open at once, or the next time this file conflicts — whichever
  comes first. Do it on a branch with nothing else in it, when no other PR is open.

### Revisit image hosting after the Supabase Pro / Vercel Pro upgrades

- **What:** Supabase Pro and Vercel Pro are both being purchased before launch (founder,
  2026-07-31). **On Supabase Pro the Storage image-transformation service becomes available**
  (100 origin images included, then $5 per 1,000), along with **Smart CDN** (automatic cache
  invalidation on replace, which the free tier does not have).
- **Why it is worth revisiting:** today images and their resizing are **split across two systems**
  — the bytes live in Supabase Storage, the resizing happens in Vercel's optimizer. On Pro they
  could live in one. That would collapse the `remotePatterns` + `minimumCacheTTL` + `deviceSizes`
  coupling described in the discovery report §2b into a single provider's cache, and Smart CDN
  would remove the never-overwrite-the-path rule that the current design depends on.
- **NOT a reason to change anything now.** The upload-time downscale and the storage RLS are
  **correct under either arrangement** — the downscale is what protects the storage cap regardless
  of who resizes, and the path-ownership policies do not care. This is an option to evaluate, not
  debt to pay down.
- **Also re-check at that point:** Vercel's Fair Use policy restricts **Hobby to non-commercial
  personal use**, which is a live question for a COD marketplace (discovery report §2a). The Pro
  purchase resolves it; note it as resolved when it lands.
- **Trigger:** after both upgrades are active. Re-run the §2d cost comparison with Pro numbers
  before moving anything.

### Orphaned storage objects need a reconciliation sweep before the first deletable image surface

- **What:** there is **no transaction spanning Postgres and Supabase Storage**, so a row delete
  cannot atomically delete its object and a trigger cannot reliably do it either. Orphans are a
  **reconciliation problem, not a prevention problem.**
- **Why it is not needed yet:** this PR ships exactly one writer — avatars — and the avatar flow
  deletes the prior object in the same server action. There is no CASCADE path that strands an
  avatar object.
- **Why it becomes needed:** deleting a *shop* cascades to `products` and then to `product_images`
  — **the DB rows vanish with no application code involved**, so there is no opportunity for an
  in-action delete to run at all. Same for any raw SQL delete, admin tool, or service-role write.
- **Shape when built:** delete-in-action for the common path, **plus** a periodic sweep that lists
  objects and deletes those with no referencing row in the owning table (`product_images`,
  `profiles.avatar_url`, `shops.logo_url`/`banner_url`, `portfolio_items`). The sweep is
  **required, not optional** — it is the only thing that catches the CASCADE case.
- **Simplified by the closed decision above:** because orders do not reference image paths, the
  sweep's "no referencing row" test stays single-table. No cross-table reference tracking.
- **Trigger:** the first PR that ships a *deletable* image surface — G5/G6/G7 (products) or G3
  (shop assets), whichever lands first.

### 🔴 Uploads are capped at 4 MB by Vercel's payload limit — many phone photos cannot be uploaded

- **What:** an avatar is sent through a **server action**, and **Vercel caps a function's request
  payload at 4.5 MB** (`413 FUNCTION_PAYLOAD_TOO_LARGE`). That is a platform limit — no
  `bodySizeLimit` value raises it. So `MAX_INPUT_BYTES` is 4 MB, `bodySizeLimit` is `4.4mb`, and a
  photo above 4 MB is refused with an honest message.
- **Why this is a real product problem, not a tidy limit:** modern phone cameras routinely produce
  4–8 MB JPEGs, against a documented **70%+ mobile-first** market. A meaningful share of users will
  hit the refusal on their first attempt with an ordinary photo. The message is honest but the
  outcome is still "you cannot set a profile picture".
- **How it was found:** the authenticated gate, not the unit tests. Next's Server Actions default to
  a **1 MB** body, so the first real 3.7 MB upload died as `Body exceeded 1 MB limit` → 413 → a
  **500 through the error boundary**, i.e. a crash page. The unit tests never saw it because they
  call `normalizeAvatar` directly and never cross the action boundary. Worth remembering as the
  general lesson: a server action's payload ceiling is invisible to any test that does not go
  through HTTP.
- **The fix, and it is the same fix HEIC needs: downscale in the BROWSER before upload.** Resizing
  to ~1600px client-side puts any phone photo comfortably under 1 MB, which (a) removes the 4.5 MB
  cliff entirely, (b) makes the server action payload small and fast on mobile data, and (c) is the
  same code path that would convert HEIC. One change closes both entries.
  - Do NOT instead route uploads around the action to storage directly to dodge the cap: that
    trades the limit for a signed-upload flow and loses the server-side re-encode, which is the
    platform's actual content gate.
- **Trigger:** before real sellers onboard, or the first report of a failed photo upload. Pair it
  with the HEIC entry below — one client-side normalize step, both problems.

### HEIC uploads are rejected, not converted — client-side conversion is the real fix

- **What:** the avatar upload action rejects HEIC/HEIF with an explicit FR/AR message pointing the
  user at the iOS setting. It does **not** convert.
- **Why this matters more than it sounds:** **HEIC is what an iPhone shoots by default**, against a
  documented 70%+ mobile-first Tunisian market. So this is not an edge case — it is a meaningful
  share of real uploads hitting a rejection.
- **Why rejected rather than converted:** `sharp`'s prebuilt binaries generally lack HEIF decode,
  so the decode fails inside the very step that is the content gate. A silent failure there would
  be worse than an explicit refusal.
- **Why the message is specific rather than generic:** a bare "format non supporté" on the format
  an iPhone shoots by default reads as the app being broken. The shipped message names the fix:
  *« Réglages > Appareil photo > Formats > Plus compatible »*.
- **The real fix:** convert client-side before upload (a browser-side HEIC decoder produces a
  JPEG/WebP the server can then normalize), so the user never sees a rejection. Costs a client
  bundle addition, which is why it is not in this PR.
- **Trigger:** first real report of an iPhone user blocked, or the next avatar/upload UX pass —
  whichever comes first. Worth measuring the rejection rate before spending the bundle.
### `orders.carrier` is seller-writable in the schema with NO surface that can write it

- **What:** migration `20260729111938` grants `UPDATE (carrier, tracking_number)` to
  `authenticated`, and `enforce_order_identity_lock` narrows both to the seller. But **G9's
  panel-suivi renders the carrier READ-ONLY**, because Figma `497:26411` draws "Société de livraison"
  as static text in an `lv` block and gives an `Input` only to the tracking number. So the column is
  writable and nothing writes it — it renders an em-dash on every order.
- **Why it shipped that way (founder call, and Figma agrees):** the alternative was an input with no
  source of truth. A per-order carrier free-text box invites seven spellings of "First Delivery" and
  makes a later rate table or bordereau unjoinable. Shipping a dead input is the exact defect the
  panel was originally withheld to avoid.
- **Where it should come from:** `shops.preferred_carriers` (text, nullable) is a shop-level default.
  **CORRECTED (`feat/g3-shop-edit`, 2026-08-15): no longer unused** — it became writable in PR #129
  (`/ma-boutique/creer/configuration`'s "Livraison" accordion), and G3 now links a returning owner
  straight to that page. **What is still open:** neither #129 nor G3 makes G9's order form READ
  `preferred_carriers` — the shop owner can set their carriers, but no order defaults from it yet.
  The gap this entry describes (G9's carrier field has no source of truth) is unchanged; only the
  "unused column" half of the diagnosis is resolved.
- **Decide before building:** `preferred_carriers` is a free-text column today. If carriers become a
  selectable set it wants either a CHECK'd enum or a small lookup table — the discovery report
  explicitly deferred a `carriers` table as a Phase 3 question. Do not add the G9 Select before that
  is answered, or the two will disagree.
- **Trigger:** the delivery-documents PR, or the next G9 pass — the bordereau needs a carrier per
  order, so it forces the question. (The G3 shop-edit build, previously named as a trigger here, has
  now landed and did not close this — see the correction above.)

### G9 stepper connector colours diverge from Figma, held because `OrderRail` has two consumers

- **What:** Figma `495:26289` paints the **traversed** connector `#1f5fe0` (blue/600) and the
  untraversed one `#cbd5e1` (border/strong). The shipped rail paints them `#cbd5e1` (`border-strong`)
  and `#e2e8f0` (`border-subtle`) — i.e. Figma marks progress in brand blue, the code marks it in a
  darker grey. Rows **S8/S9** of `docs/design/g9-deltas-2.md`.
- **Why deferred:** `OrderRail` is shared. Its current colours are **E3's measured treatment**, and
  repainting them changes the buyer's rail on `/mes-commandes` against a frame (`709:59662`) that this
  pass did not measure. That makes it a two-consumer decision, not a delta fix.
- **Measured on both consumers** (2026-07-30, authenticated, after the `w-14 → lg:w-20` fix), so the
  next pass does not have to re-measure to scope it:
  | | G9 (7-step product) | E3 (4-stage service) |
  |---|---|---|
  | 1440: nodes / container / slack | 7 × 80 = 560 in 1071 → **−511** | 4 × 80 = 320 in 1081 → **−761** |
  | 375: nodes / container / slack | 7 × 56 = 392 in 278 → **+114 (overflows)** | 4 × 56 = 224 in 296 → **−72 (fits)** |
  | labels | 12/16, 0 of 7 wrap at 1440 | 12/16, 0 of 4 wrap at 1440 |
- **Trigger:** measure `709:59662`'s rail, then repaint both together — or accept the divergence
  deliberately and record it in the E3 delta file.

### 🔴 tailwind-merge cannot classify our custom `text-*` SIZE tokens, so `cn()` silently drops them

- **What:** `twMerge` recognises a font-size utility either by name (built-in `text-sm`, `text-xl`)
  or by an arbitrary value (`text-[12px]`). Our design-system sizes are **neither** — `text-h1`,
  `text-h3`, `text-body`, `text-body-sm`, `text-caption` are `@theme` utilities — so twMerge files
  them under the catch-all `text-*` **colour** group. Any `cn()` string that pairs a size token with
  a colour token therefore keeps only the later one, and the loser vanishes with no error, no lint
  failure and a green build. Reproducible in three lines:

  ```js
  twMerge('text-caption text-text-secondary')  // → 'text-text-secondary'   size lost
  twMerge('text-body-sm text-text-muted')      // → 'text-text-muted'       size lost
  twMerge('text-h3 text-text-primary')         // → 'text-text-primary'     size lost
  ```

- **Three instances have now SHIPPED**, which is why this is filed as a class and not a bug:
  1. a **size** evicted during the /marche/services rebuild (`text-body-sm`),
  2. a **colour** evicted on G9's WhatsApp label (`text-text-primary`, 1.69:1 contrast — an
     accessibility failure that reached production),
  3. a **size** again on `OrderRail`'s stepper labels — 12px labels rendered at the inherited 16px
     inside a 16px line box on **both** G9 and E3.
- **Full inventory (scanned across every `cn()` site in `src/`): 4** at last count, **+2 more found
  and closed 2026-09-06 during H5's fidelity pass** (DOM-verified live, not just grep — see H5's own
  entry above), **+1 sibling spotted while fixing those** (same file shape, a different route, not
  touched — one-PR-one-focus). Running total: **7**. Two were closed in `feat/orders-snapshot-wiring`
  because they were visible and one of them was a named G9 delta:
  | site | loses | state |
  |---|---|---|
  | `components/orders/OrderRail.tsx` label | `text-caption` (12→16) | ✅ **closed** — plain template |
  | `tableau-de-bord-vendeur/_components/Panel.tsx` link | `text-body-sm` (14→16) | ✅ **closed** — plain template |
  | `app/commandes-recues/page.tsx` tab | `text-body` | ⚠ **open — latent**, inherited size is also 16 so nothing renders wrong *today* |
  | `app/commandes-recues/_components/SortSelect.tsx` | `text-body` | ⚠ **open — latent**, same |
  | `mes-services/_components/ServicesList.tsx` table-header labels | `text-caption` (12→16) | ✅ **closed** 2026-09-06 — plain template (DOM-verified: `fontSize` 16px through `cn()`, 12px after) |
  | `mes-services/_components/ServiceRow.tsx` "Voir" link | `text-body-sm` (14→16) | ✅ **closed** 2026-09-06 — plain template (DOM-verified) |
  | `mes-produits/_components/ProductRow.tsx` "Modifier" link | `text-body-sm` (14→16, presumed) | ⚠ **open — not verified live, not fixed**. Byte-identical `cn()` string to ServiceRow's own "Voir" link, on an already-shipped G5 route — out of an H5 PR's scope. |
  The `⚠ open` rows are **landmines, not defects**: several are invisible only because 16px happens
  to be the inherited size. Any future change to the ancestor's size makes them wrong silently.
- **The local fix used, and why it is the right shape:** drop `cn()` and use a plain template
  string. Class ORDER is not a guard rail — reordering "fixes" it until the next edit reorders it
  back, and that is how instance 3 happened after instance 1 was understood. Removing the merge
  makes the collision **structurally impossible**. `cn()` remains correct wherever there is no
  size+colour pair (e.g. `OrderRail`'s circle: bg/border groups only). There is precedent:
  `TopbarSearch` swapped `cn()` for a template for exactly this reason.
- **Systemic fix — a founder decision, deliberately NOT built here.** Three options, cheapest last:
  1. **Extend twMerge's config** — `extendTailwindMerge({ extend: { classGroups: { 'font-size': [{ text: ['h1','h2','h3','h4','body','body-lg','body-sm','caption'] }] } } })` in `src/lib/utils.ts`. One
     edit, fixes every present and future site, and makes `cn()` behave as everyone already assumes.
     Risk: it changes merge behaviour app-wide, so it wants a VRT run over all 32 baselines.
  2. **A lint rule** — `eslint-rules/` already exists. Flag any `cn()` argument list containing both
     a size token and a `text-*` colour token. Catches new instances but fixes none, and cannot see
     through a variable.
  3. **Rename the tokens** so twMerge classifies them (e.g. `text-size-caption`). Most invasive —
     touches every call site in the app — and buys nothing option 1 does not.
  **Recommendation: option 1 plus option 2** — the config makes `cn()` correct, the lint rule stops
  anyone reintroducing the pattern in a component that does not use `cn()`.
- **Trigger:** the next DS/token pass that can afford a VRT re-baseline. Do it before the typography
  token pass, not after — that pass will touch every one of these strings.

### `OrderRail` overflows its container at 375 (pre-existing, and it bounds the desktop fix)

- **What:** the rail's nodes are `shrink-0`, so they cannot compress. At a 375 viewport the rail's
  container measures **278** while 7 product nodes at `w-14` sum to **392** — a **114px** overflow.
  Measured, not inferred. **This is G9-specific: the 4-stage E3 buyer rail fits** — measured 224 in a
  296 container at 375 (−72 slack), and 320 in 1081 at 1440 (−761). So the defect is the 7-step
  PRODUCT chain, not the shared component.
- **Why it is logged rather than fixed:** it is **pre-existing** (`w-14` is unchanged from the G9
  delta pass) and it is what forced the desktop node widening to be **lg-only**: `w-20` unconditional
  would have taken the mobile overflow from 114 to **282**, i.e. made a real defect 2.5× worse in
  order to close a cosmetic one. So below-lg geometry was left byte-identical to what shipped.
- **The honest fix is a design decision, not a value:** a 7-step rail does not fit 375 at any
  legible node width (7 × 44 minimum touch-ish column = 308 > 278). It needs either a horizontally
  scrollable rail, a vertical rail below lg, or a condensed "step 4 of 7" representation. **There is
  no mobile frame for G9** — nor for any of the ten seller pages — so this cannot be measured, only
  designed.
- **Trigger:** whenever G9/E3 get a mobile frame. Fold in the separate 375 shell overflow already
  logged (the topbar right cluster) — at 375 this page currently reports a **73px** document
  overflow in total, and the two causes should be separated by measurement, not guessed at.

### 🔴 `received_at` is stamped in app code only — nothing in the database enforces it

- **What:** `orders.received_at` is written at exactly **two client call sites** —
  `src/components/ReceiptConfirmButton.tsx:33` and
  `src/app/mes-commandes/_components/OrdersList.tsx:253` — both `.update({ status: 'received',
  received_at: new Date().toISOString() })`. The latter's own comment says it outright:
  *"received_at is stamped here because the trigger does not set it."* **No trigger, constraint or
  default touches the column.** `nextSellerStatus` returns `null` at `received`
  (`lib/types/order-status.ts:54`), so the seller path provably cannot reach the state — but seeds,
  raw SQL, service-role writes and any future admin action all can, and all leave it NULL.
- **Evidence from live data (14 orders):** 4 are at `received`; **only 3 carry a `received_at`, and
  only 1 of those came from the buyer action.** The tell is timestamp precision —
  `new Date().toISOString()` yields milliseconds, Postgres arithmetic on `created_at` carries
  microseconds:
  | order | `received_at` | verdict |
  |---|---|---|
  | `191d4307` | `20:10:58.544` — ms precision, 2s before `updated_at` | real buyer click |
  | `bdb55a1a` | `.284896` — identical microseconds to its own `created_at` | seeded arithmetic |
  | `c798df04` | `.407` — same signature as its `created_at` | seeded arithmetic |
  | `33b822ec` (the only **product** order at `received`) | **NULL** | seeded straight to `received` |
- **Consequence, and it is user-visible:** G9's title row renders
  `order.receivedAt ? "Reçue le …" : "Créée le …"` (`commandes-recues/[id]/page.tsx:111-114`). On
  `33b822ec` — a delivered, terminal order — it renders **"Créée le 3 juin 2026"**. The Figma
  (`495:26112`) shows "Reçue le …". So this reads as a layout/copy delta and **is not one**: the
  page is correct and the data is absent. A terminal order with no terminal timestamp.
- **Why it is urgent rather than cosmetic:** both stamping sites are the buyer-side client
  `.update()` calls **already logged for migration to server actions**. If that migration moves the
  status write and not the stamp, every future received order loses its timestamp *silently*, and
  `admin/statistiques` already aggregates on `received_at` (`.gte('received_at', sevenDaysAgo)`) —
  so the number quietly under-reports.
- **Fix:** stamp it in the DB. `check_order_status_transition` is already a BEFORE UPDATE trigger on
  the right table; a `set_received_at_on_transition` sibling (mirroring the shipped
  `trg_set_cancelled_at_on_transition`, which solves precisely this problem for `cancelled_at`)
  makes it unconditional. Note the ordering constraint recorded in `db/migrations/…_order_events`:
  BEFORE triggers fire in alphabetical name order, so pick a name that sorts before the event
  emitter or the emitted event will carry a null stamp.
- **Trigger:** the migration PR that converts the three buyer-side client `.update()` calls to
  server actions — do both in one pass, since that is the moment the app-side stamp disappears.
  Backfill is **not** proposed: we do not know when `33b822ec` was received.

### Audit consumer surfaces for `admin_hidden_at` filtering
- **What:** The marketplace browse/search queries do not all filter out admin-hidden
  shops/freelancers consistently. `lib/marche/data.ts` (`getActiveProducts` /
  `getActiveServices`, powering **/marche**) and `lib/search/search-marketplace.ts`
  (powering **/recherche**) filter only on `status='active'` — they do **not** exclude
  rows whose parent shop/freelancer has a non-null `admin_hidden_at`. The detail/order
  paths (`lib/marche/product-detail.ts`, `lib/marche/demander.ts`,
  `app/demander/[id]/actions.ts`) **do** check `admin_hidden_at`. So a moderated seller
  can still appear in browse/search listings while their detail page is blocked.
- **Why deferred:** Fixing only /recherche would create a worse inconsistency between two
  sibling surfaces. The right fix is one moderation PR that aligns **/marche, /recherche,
  and /categories** (once built) together.
- **Trigger:** Before launch (Phase 10 polish), or sooner if moderation goes live. Fold
  in /categories/[slug] when that page lands.

### Remove /marche's dead inline `?q=` search path
- **What:** With the header search repointed to **/recherche** (see
  `components/marche/MarcheTopBar.tsx`), `/marche`'s own inline `?q=` handling in
  `app/marche/page.tsx` (and the `q` plumbing through `getActiveProducts(q)` /
  `getActiveServices(q)`) is no longer reached from the UI.
- **Why deferred:** Kept as a no-op for this PR to keep the search build scoped to adding
  /recherche; deleting browse-page query handling is a separate, reviewable cleanup.
- **Trigger:** A dedicated cleanup commit after /recherche is merged and verified.

### Add category description + nesting columns
- **What:** Two related gaps surfaced building **/categories/[slug]**:
  1. **No description columns.** The `categories` table has no `description_fr` /
     `description_ar`, so the category header renders the name only (no intro copy). A
     migration adding those columns would let the page show a short category blurb.
  2. **Flat taxonomy.** Every category has `parent_id = null` — no parent/child rows
     exist. The sub-category drill-down strip (`SubcategoryStrip`) is built and renders
     correctly, but shows nothing until nesting data exists. The "browse sub-categories"
     UX is unverifiable against current data.
- **Why deferred:** Both need a schema migration (approval-gated) plus admin content
  entry; out of scope for the page build.
- **Trigger:** When the category taxonomy is fleshed out (admin dashboard / Phase 9+).

### In-category type switch on /categories/[slug]
- **What:** On a non-empty category page, there is no always-visible control to switch
  Produits↔Services *within the category*. The shared shell's top toggle navigates to
  /recherche (per the locked "topbar unchanged" rule), and the in-category switch only
  appears as "Voir l'autre type" on the empty state.
- **Why deferred:** Adding an in-content type toggle would reintroduce the kind of
  results-header control just removed from /recherche; needs a design decision.
- **Trigger:** If click-through shows users need to flip type without leaving the category.

### Legal pages: lawyer review + cookie consent + redaction consistency
- **What:** `/conditions`, `/confidentialite`, `/cookies`, `/accessibilite` are honest
  DRAFTS (each carries a prominent draft banner). Before public launch they must be
  reviewed by a qualified Tunisian lawyer (release-blocking gate per engineering-standards
  §7). Three related items:
  1. **Cookie consent banner + preferences modal** are referenced in the cookies/privacy
     text but NOT built (Phase 10).
  2. **Legal entity name + physical address** (required by Tunisian commerce regulation)
     are unknown — not yet rendered anywhere; add when known.
  3. **Redaction consistency:** the legal pages deliberately avoid vendor/region names
     ("serveurs européens", not "Francfort"). The **FAQ** (`faq.confidentialite.q1.a`)
     still says "Francfort, Allemagne" — consider softening it to match the legal pages'
     redaction posture.
- **Why deferred:** Lawyer engagement + cookie-consent infra + the entity registration
  are launch-gate items, not this PR's scope.
- **Trigger:** Phase 10 / pre-launch legal gate.

### Arabic legal/content translations need native Tunisian review
- **What:** All About/Contact/FAQ/legal/system Arabic strings are provisional MSA
  translations (the warm section openers especially may not carry the same tonal warmth).
- **Trigger:** A native Tunisian Arabic review pass before launch.

### Contact form has no backend (stub server action)
- **What:** `/contact`'s form posts to `submitContactMessage`
  (`src/app/(marketing)/contact/actions.ts`), which re-validates, `console.log`s a safe
  summary, and returns success. There is no `contact_messages` table and no transactional
  email — messages are not persisted or delivered anywhere.
- **Why deferred:** No email service (Resend) or table at MVP; the form UI + validation +
  success UX are the deliverable now.
- **Trigger:** Phase 10 — wire to Resend and/or persist to a `contact_messages` table
  (migration). Also confirm the public WhatsApp number (placeholder `+216 XX XXX XXX`)
  and the social-media accounts (currently "Bientôt disponible").

### FavoriteButton fires one auth.getUser() per instance
- **What:** `src/components/FavoriteButton.tsx` calls `supabase.auth.getUser()` in a
  per-instance `useEffect` to decide the heart's filled/empty state. A page with N cards
  fires N independent getUser round-trips on mount. The logged-in consumer homepage shows
  products + services together (~19 hearts), so it fans out ~19 getUser calls at once
  (visible as aborted "TypeError: Failed to fetch" in headless tests when the page closes
  mid-flight; harmless in a real browser, just wasteful).
- **Why deferred:** FavoriteButton is a shared component used on every consumer surface
  (/marche, /recherche, /categories, /mes-favoris, homepage); optimizing it (share auth
  state via context, or pass logged-in + favorited-ids from the server page) is its own
  change with its own test pass. Not introduced by the homepage — just surfaced by it.
- **Trigger:** A consumer-performance pass, or when wiring real auth context.

### Consider a 'Tous' (all) results tab on /recherche
- **What:** /recherche searches one catalog at a time (Produits OR Services). A combined
  "Tous" tab would need a unified card variant or a sectioned layout (the two existing
  cards have incompatible layouts).
- **Why deferred:** No evidence yet that users want cross-type results; avoids a new card
  variant at MVP.
- **Trigger:** Post-launch, if search analytics show users toggling between types on the
  same query.

### Button's single disabled treatment conflates two different meanings — ruled OUT of scope for G7 (fix/g7-header-and-dirty-state, 2026-08-18)
- **What:** the F3 `Button` primitive (`src/components/ui/button.tsx`) applies one recolor
  (`VARIANT_DISABLED`, `bg-surface-sunken text-text-muted`, lines 52-59) to every disabled state
  regardless of *why* it is disabled. Two distinct semantics share it across call sites: **"fill
  in the form" gates** — the control becomes enabled once the user acts (e.g.
  `components/produits/ProductForm.tsx:322`, `disabled={!canPublish}` on the Publish button) —
  and **hard blocks** — the control cannot become enabled by anything the user types in this
  session (e.g. `app/mes-produits/[id]/modifier/_components/EditProductForm.tsx:404`,
  `disabled={product.hasOrders}` on the delete button, permanently blocked while the product has
  order history, with adjacent copy explaining why).
- **Why one shared treatment cannot be right for both (founder ruling, 2026-08-18):** a gate wants
  to read as "not yet — do the thing and this unlocks." A hard block wants to read as "not
  available, and nothing you type here changes that." The same grey undersells the block and
  oversells the gate; fixing one by recoloring it would misrepresent the other.
- **Ruled OUT of G7:** this is a design-system decision on the primitive's `VARIANT_DISABLED`
  table, not something a single edit form should patch around. G7 ships with `Button` unchanged.
- **Trigger:** a DS pass on `Button` — likely wants a second disabled treatment (e.g. a
  `disabledReason`/hard-block variant, mirroring the `disabledTitle` pattern G7's own status
  `Select` already uses at `EditProductForm.tsx:374-375`) rather than one boolean `disabled` prop
  covering both meanings.

### G7's `536:32841` "produit en brouillon" specimen stays logged as blocked-on-schema — not deleted (fix/g7-header-and-dirty-state, 2026-08-18)
- **What:** still standing from `docs/design/g6-discovery.md` §8 (lines 585-623): G7 has a
  dedicated Figma specimen (`536:32841`, "G6 — produit en brouillon") for a `draft` product state,
  but the live `products.status` CHECK (`CHECK (status = ANY (ARRAY['active', 'hidden',
  'sold_out']))`) has no `'draft'` value. Of that doc's three options, only **option A** (add
  `'draft'` to the CHECK, then audit every `status='active'` read path) makes the frame buildable
  as designed; the schema shipped with **option B** (map "brouillon" → `hidden`), which the
  discovery doc already flagged makes `536:32841` "unbuildable as designed."
- **Ruling (founder, 2026-08-18):** keep the frame reference in the registry/discovery docs,
  flagged blocked-on-schema — do not delete it. It documents a real, still-open product decision
  (whether drafts get their own status), not a stale artifact.
- **Trigger:** the migration PR that adds `'draft'` to the CHECK (option A, `g6-discovery.md` §8),
  audited against every `status='active'` read path (`lib/marche/data.ts`,
  `lib/marche/filter-categories.ts`, search, D3, D1).

### `DashboardSidebar.tsx` has a stale `/mes-missions` href — left alone, dead code
- **What:** `src/components/dashboard/shell/DashboardSidebar.tsx:29` still hrefs `/mes-missions`
  (surfaced by `feat/annonces-vocab-rename`'s route move to `/mes-annonces`). Traced its mount
  chain: it's rendered only by `DashboardShellClient.tsx`, which itself has **zero render call
  sites anywhere in `src`** — same orphaned legacy-shell family as `DashboardRightRail.tsx` and
  `ActiveMissionsWidget.tsx`, both deleted in that PR for the same reason. This one wasn't named
  in that PR's scope, so it was left in place rather than decided on unilaterally.
- **Why not just fix the href (it costs nothing):** it would make dead code look maintained. The
  href is harmless regardless — `/mes-missions` 308s to `/mes-annonces` (`next.config.ts`), so even
  if this component were somehow mounted, nothing would 404. Fixing the string without addressing
  that the component has no live caller papers over the real question, which is whether this whole
  legacy `DashboardSidebar`/`DashboardShellClient` tree should be deleted outright.
- **Trigger:** the next PR that touches this legacy dashboard-shell family (or a dedicated
  dead-code sweep) — decide delete-outright vs. keep-and-fix-the-href then, with the founder.

### Staged-rename-shadows-unstaged-content — the class of bug that broke #148, now a named rule
- **What happened:** `feat/annonces-vocab-rename` (#148) staged file renames early (`git mv`-style:
  `MissionCard.tsx → AnnonceCard.tsx` etc.), then edited the *content* of those already-renamed
  files afterward — internal identifiers, i18n key references, a dead-code deletion. Those edits
  landed in the working tree on top of an already-staged rename, which `git status --short` reports
  as `RM`: **R**enamed-and-staged, **M**odified-again-and-unstaged. The commit step read `RM` as
  "already staged, nothing to do" and staged only the *other* modified files, explicitly skipping
  the renamed ones on that belief. `git commit` therefore committed the bare renames — zero of the
  content fix — while `tsc`/the suite/screenshots had all been run against the working tree, which
  genuinely had the fix. `git push` followed immediately. The gap sat on `main` undetected until
  `fix/annonces-dangling-imports` traced it back to `741eb08` itself via an isolated worktree
  (`tsc --noEmit` inside a fresh worktree pinned to that exact commit still shows the 12 errors).
- **The rule:** `RM` (or any status with a non-blank *second* column — `RM`, `AM`, `MM`) means
  **staged action PLUS unstaged content on top of it.** It is never "fully staged." Only a
  single-letter code with a blank second column (`M `, `A `, `R `, `D `) means nothing further is
  pending for that path. Never infer "fully staged" from the presence of *a* staged marker — check
  the second column specifically.
- **A second, independent trap in the same incident:** a `git add` invocation with **any** invalid
  pathspec in its argument list fails the *entire* command — none of the valid paths in that same
  call get staged either. Two of the three `git add` attempts in #148 failed this way (one against
  an already-renamed-away directory, one against an already-fully-staged deletion) and staged
  nothing; only the third, narrower attempt succeeded — and it was narrowed by excluding the paths
  under the `RM` misreading above, which is how the drop happened.
- **The gate that follows from both (precise wording — a first pass at this got it wrong):** the
  rule is **not** "`git status --porcelain` must be empty." Pre-existing untracked `??` clutter
  (this repo has ~20 such lines from unrelated earlier work) does not violate anything and will
  never go away between commits — demanding zero bytes of output makes the gate fail permanently
  and teaches people to stop trusting it. The actual invariant: **no tracked path that belongs to
  the commit's own working set may carry a second-column marker.** Concretely, after `git commit`,
  before `git push`, run `git status --porcelain` and read only the lines whose first column is a
  tracked-file code (`M`, `A`, `R`, `D`, `C`, `U`) — every one of those must have a **blank** second
  column (`M `, `A `, `R `, not `RM`/`AM`/`MM`). `??` lines are untracked and outside this check
  entirely, whether they're pre-existing clutter or something new — an untracked leftover from your
  own change is a *different* mistake (an omitted file), not this one. Then run `tsc`/the test
  suite/the build **against the committed tree** (a fresh worktree or a post-commit checkout), not
  the working tree. A working-tree verification proves the *code* is correct; it proves nothing
  about what the commit — the thing that actually ships — contains.
- **Trigger:** already in force — apply this gate to every commit from here on, not just PRs that
  touch renamed files.

### Junctioning `node_modules` into a scratch worktree destroys the real one
- **What happened:** verifying `741eb08` in isolation (the entry above) used a scratch git worktree
  with `node_modules` junctioned in (`New-Item -ItemType Junction`) rather than reinstalled, to
  avoid a multi-minute `npm ci` for a one-off check. `git worktree remove --force` on that worktree
  errored ("Filename too long") partway through — and had, before failing, recursed **through the
  junction into the real `node_modules`** and started deleting inside it. `node_modules/.bin` was
  gone entirely afterward; the actual packages (`next`, `vitest`, `typescript`, …) survived because
  the delete aborted mid-walk, not because junctions were respected as opaque.
- **The false-green tell:** with `.bin` gone, `npx tsc --noEmit` did not error — it silently
  resolved to an unrelated same-named package on the npm registry (`tsc@2.0.4`, a placeholder that
  prints "this is not the tsc command you are looking for") and exited non-zero on ITS OWN terms,
  which looked like a real compile failure until inspected. Had that placeholder instead exited 0,
  a `tsc --noEmit` check would have reported clean while checking nothing. Same class of trap as
  `getComputedStyle` returning a live object that reads plausible while measuring the wrong thing,
  and Tailwind v4 compiling an unrecognized utility to standalone longhand properties instead of
  erroring: **the tool degrades to something that still runs and still looks like an answer.** A
  missing/wrong binary on `PATH` is not always a loud failure — check `node_modules/.bin/<tool>.cmd`
  exists (or invoke `node node_modules/<pkg>/bin/<tool>` directly) if a familiar `npx` command
  starts behaving strangely, rather than trusting its exit code alone.
- **The rule:** never junction (or symlink) `node_modules` into a scratch worktree. Either accept
  the full `npm ci` cost for that worktree, or — if the check is read-only and fast — run it without
  installing anything by pointing `NODE_PATH`/a temp `tsconfig` at the main repo's `node_modules`
  instead of merging directory trees. If a worktree with a junctioned `node_modules` was created
  anyway, **do not** `git worktree remove` or `rmdir /s` it — remove the junction itself first
  (`Remove-Item <path>\node_modules` with no `-Recurse`, which unlinks a junction without
  descending into its target), confirm the real `node_modules` is untouched, then remove the rest
  of the worktree normally.
- **Recovery, if it happens again:** don't patch around a missing shim. Full `Remove-Item -Recurse
  -Force node_modules` + `npm ci`, then re-verify `.bin` exists and the tool resolves correctly.
  A partial fix (reinstalling just the missing piece) doesn't rule out other silent damage from the
  same aborted delete.
- **Trigger:** already in force — no scratch worktree should ever share `node_modules` with the
  main tree via junction/symlink again.

### Select-field consolidation still owed — one shared constant, three copies, no real component (PR-D, `feat/annonces-form-ds`, 2026-08-19)
- **What:** PR-D extracted `SELECT_FIELD_BASE` into `components/layout/styles.ts` (alongside
  `FOCUS_RING`/`CARD_SHADOW`) from E1's local `selectField` shape (`ProductRequestForm.tsx` —
  deliberately, not G6's: E1's version omits the border color so a caller can append
  `border-danger-500` on error, which PR-D's per-field error state needed and G6's own copy, baked
  to `border-border-strong` unconditionally, did not support). G6's `ProductForm.tsx` and the new
  `/mes-annonces/nouvelle` both now consume the shared constant. **E1's own `ProductRequestForm.tsx`
  still has its local copy, untouched** — task scope named only "here and G6," not the extraction's
  own source file, so there are now three call sites (G6, annonces, E1) and one shared definition
  E1 itself doesn't use yet.
- **Why deferred:** consolidating E1 onto the shared constant is a one-line, zero-risk change, but
  bundling it into a form-rebuild PR not otherwise touching E1 widens the diff for no behavioral
  reason. The bigger item — a real DS `Select` component (out of scope per PR-D's own brief: "DS
  Select" is explicitly listed as out of scope) — is the actual fix; the shared string constant is
  a stopgap three routes now depend on informally.
- **Trigger:** the DS pass that finally builds a real `Select` primitive (Section 4's locked
  component list already names it), or a small consolidation commit that points E1 at
  `SELECT_FIELD_BASE` too in the meantime.

### `Input`/`Textarea`'s `required` prop couples the visual asterisk to `aria-required` — blocks the HYBRID no-asterisk rule on a majority-required form (PR-D, `feat/annonces-form-ds`, 2026-08-19)
- **What:** `/mes-annonces/nouvelle` is a majority-required form, so the locked HYBRID field-marking
  rule applies: required fields carry NO visual asterisk (optional fields carry "(optionnel)" in
  the label text instead, already true of every optional label in this form). Category and Ville
  are native `<select>`s, so PR-D wired `aria-required="true"` on them by hand with no asterisk —
  clean. **Title (`Input`) and Description (`Textarea`) could not follow the same rule.** Both
  primitives expose exactly one `required: boolean` prop that does two things at once
  (`components/ui/input.tsx:83` / `components/ui/textarea.tsx`, same shape): it renders the
  visual asterisk AND sets `aria-required`. There is no way to ask for one without the other.
- **Confirmed structurally impossible to route around from the caller side, not just inconvenient:**
  both primitives spread `{...props}` onto the native element and THEN set
  `aria-required={required || undefined}` as an explicit JSX attribute afterward — in React, an
  explicit attribute declared after a spread always wins, including when its value is `undefined`,
  which removes the attribute. So passing `aria-required="true"` through the props spread while
  leaving `required` unset does not survive; it gets silently overwritten to `undefined`. There is
  no prop combination that yields "aria-required, no asterisk" without editing the primitive.
- **What PR-D shipped instead, and why it's a report rather than a fix:** Title and Description
  ship with NEITHER the asterisk NOR `aria-required` under this interim — not a regression (the
  form they replace had neither either — no `required` handling existed anywhere in the old
  hand-rolled version), just not yet the full HYBRID rule. Editing `Input`/`Textarea` to add a new
  prop was deliberately not done unilaterally inside a form-rebuild PR: it is a shared-primitive
  contract change touching every one of their existing call sites (G6, E1, H2, H3, G2's
  configuration step, …), which is a decision for a DS pass, not a side effect of this one.
- **The fix, when someone picks this up:** split the concern into two props — e.g. keep `required`
  for the common case (asterisk + aria-required together, today's behavior, no call site needs to
  change) and add `hideRequiredMarker?: boolean` (or equivalently `ariaRequired?: boolean`
  independent of the visual `required`) for a caller that wants aria-required without the
  asterisk. Additive, so every existing call site is unaffected.
- **Trigger:** the next DS pass on `Input`/`Textarea`, or the next majority-required form built
  after this one that hits the identical wall.

### Native `type="date"` renders in the OS/Chromium locale, not the app's `lang` — mm/dd/yyyy on an AR page
- **What:** the browser's built-in date picker and its placeholder format follow the host OS/browser
  locale, which `lang`/`dir` (the app's own FR/AR switch) has no control over. On a Chromium browser
  set to an English OS locale, `/mes-annonces/nouvelle`'s Deadline field renders `mm/dd/yyyy` even
  when the page itself is rendered in Arabic (`dir="rtl"`, every surrounding label in Arabic).
  `SignupForm.tsx:294` has the identical `type="date"` field and the identical bug — confirmed by
  grep, not assumed: it is the only other `type="date"` input in `src`, so this is not a novel
  defect, it is the second known instance of one.
- **Why not fixed here:** the real fix is a DS `DatePicker` (explicitly out of scope for PR-D, and
  presumably for the signup form's own PR too) — restyling the native input, which PR-D did, does
  not touch the picker's locale behavior, which is the browser's, not CSS's, to control.
- **Trigger:** the DS pass that builds a real `DatePicker` primitive — fix both call sites
  (`SignupForm.tsx` and `AnnonceForm.tsx`) together, since they now share the exact same defect.

### 🔴 Storage RLS content-gate gap (`chore/deps-lockfile-refresh`, 2026-08-24)
- Details held outside the repo (founder has the full write-up). Owed its own PR. High priority —
  a live gap in what the platform can honestly claim it enforces, not a UI polish item.
- **Trigger:** its own PR, before the first surface that treats these buckets' contents as trusted
  in a way stronger than "a public image renders."

## Post-MVP scale triggers

### Migrate /recherche to PostgreSQL full-text search (FTS)
- **Audit status:** RESOLVED-NO-FIX. The Audit Fix 3 pass proposed replacing search with
  Postgres FTS; Step 0 discovery showed the current search is already correct for the
  current catalog. `lib/search/search-marketplace.ts` already runs ILIKE on **both**
  `title` and `description`, is case-insensitive, and already returns the expected rows
  (e.g. "premium" → 3 products). The earlier `/recherche` 500 was stale dev-server `.next`
  corruption, not a search bug. Migrating now would add permanent schema surface for 16
  rows, override CLAUDE.md's own posture ("defer FTS until search volume justifies the
  index cost — not before"), and deliver zero user-visible improvement on current data —
  premature optimization.
- **What (when triggered):** Migrate /recherche to Postgres FTS — `unaccent` +
  `websearch_to_tsquery('french', …)` + a `setweight`ed `tsvector` generated column
  (title=A, description=B) + GIN indexes, on `products` and `service_listings` (extend to
  `shops`/`freelancer_profiles` once their cards + `/boutique`·`/freelance` pages exist —
  searching them today has no render path).
- **Trigger:** When the catalog exceeds ~1000 listings OR users start typing accented
  French / multilingual queries at meaningful volume.
- **Reference:** Migration SQL was drafted and validated against temp tables in the Audit
  Fix 3 Step 0 report. Two validated gotchas for whoever implements it: (1) `unaccent` is
  `STABLE`, so it cannot be used directly in a generated column — the raw DDL throws
  `ERROR 42P17: generation expression is not immutable`; wrap it in an `IMMUTABLE` SQL
  function calling the two-arg `extensions.unaccent('extensions.unaccent', $1)`, and
  unaccent the query side too (the `'french'` stemmer alone is not accent-insensitive —
  `élégant` ≠ `elegant` without it). (2) The `'french'` config stems English plurals
  unreliably (`sneaker`→`'sneak'` vs `sneakers`→`'sneaker'`), so reconsider the search
  config (`'simple'` / `pg_trgm`) for a multilingual FR/EN/AR catalog. Ranking via
  `ts_rank` is not expressible through supabase-js — either keep the existing JS weighted
  scorer over a `.textSearch()` filter, or add a `SECURITY INVOKER` RPC.

## DS-3b lint — architectural follow-ups (deferred from chore/fix-lint #75, 2026-07-23)

🔴 **SECURITY (pre-launch) — Admin routes have no server-side guard.** `middleware.ts` matches `/admin/:path*` but enforces only the suspended state, not `is_admin`. A non-admin can load the admin shell before the client-side `useEffect` (`src/app/admin/layout.tsx:36`) redirects them. Data is protected by RLS (admin reads require `is_admin()` per policy), so no records leak — but route access is gated client-side, which `engineering-standards.md` prohibits: "no client-side feature gating as security." Fix: `is_admin` check in `middleware.ts`, or a server-component guard in the admin layout. **Own PR — needs its own review, tested against a non-admin account before merging.**

🟡 Buyer/seller dispute UI removed as teardown orphan (PR #64 deleted its render surfaces). Rebuild prop-based when E3 order surfaces are rebuilt from Figma. Backend and admin dispute flow unaffected.

## Next.js security patch — architectural follow-up (from fix/nextjs-security-16-2-11, 2026-07-23)

🟡 **Re-verify middleware authorization when multi-locale routing lands.** CVE-2026-64642 (middleware/proxy bypass, GHSA-6gpp-xcg3-4w24) targets **single-locale `config.i18n.locales`** specifically. Servyou was **not affected** at `16.2.7`→`16.2.11` because `next.config.ts` has no `i18n` block (FR/AR is handled in `src/lib/i18n`, not Next's built-in i18n routing). When the i18n foundation later adds real multi-locale routing (i18n config and/or locale-prefixed paths), **re-verify that `middleware.ts`'s suspended-state gate — and any auth added to it — cannot be bypassed via locale-prefixed request paths.** Trigger: the i18n multi-locale routing PR.

🟡 **Residual npm-audit advisories after `next@16.2.11` (all transitive; the patch cleared every `next` CVE).** `npm audit` still reports 8, none in `next` itself:
- **`sharp` <0.35.0** (high, GHSA-f88m libvips) — `next`'s **optional** image dep, pinned `0.34.5`; the next bump does not move it. **Verified not imported anywhere in `src`** (grep) and no server-side image-processing path exists — so it is reachable only via `/_next/image`, which Vercel serves on platform infra, **not** the bundled sharp. No app-runtime exposure. Fix = an explicit `sharp` bump or an `overrides` pin (**never** the `next@14.2.35` downgrade npm audit suggests). Low priority given the Vercel path.
- **`@opentelemetry/core`** (moderate, GHSA-8988) — via `@sentry/nextjs` (prod). Bump Sentry / OTel.
- **`brace-expansion` ×2 / `fast-uri` ×2 / `js-yaml`** (high, but **dev-scope** — eslint / typescript-eslint / webpack build chains; not in the production runtime). A plain `npm audit fix` resolves these non-breaking ("changed 8 packages").
- Optional: bump `eslint-config-next` `16.2.7` → `16.2.11` to match `next`.

Trigger: a dependency-hygiene chore, or when the Dependabot PRs land.

## DS-3b-3 font-sizes — follow-ups (from feat/ds-3b-3-font-sizes, 2026-07-24)

🟡 **24 font-size literals (15 sites) intentionally retained** — no clean tier in the v2 ramp, or responsive pairs where half-tokenizing breaks the mobile→desktop ramp. Most live in components scheduled for Figma rebuild (`ServiceListingCard`, `ProductListingCard`, `OrderCard`, `OrderDetail`, consumer dashboard). Re-evaluate after those land rather than forcing a tier now. *(Retained: 2× `text-[10px]` badges, 3× `text-[17px]`, and 11 responsive pairs — `text-[30px] md:text-[40px]` ×6, `text-[22px] md:text-[28px]` ×2, `text-[17px] md:text-[20px]`, `text-xl md:text-[22px]`, `text-2xl md:text-[28px]`. Each commented at its site.)*

🟡 **SharedSearchBar input font 14px — triggers iOS zoom-on-focus.** Standards require 16px minimum on inputs (`servyou-standards-reference.md`, mobile section) because iOS zooms the viewport on focus below 16px. `components/dashboard/shell/SharedSearchBar.tsx:99` is an `<input>` rendering across every consumer page. **Fix in the component audit pass** — it's a behaviour change, not a token swap. *(DS-3b-3 tokenized it to `text-body-sm` (still 14px) as a like-for-like swap; the 16px fix is separate.)*

## /marche/services rebuild — follow-ups (from feat/rebuild-marche-services, 2026-07-24)

🔴 **No `avatar_url` column anywhere — the freelancer world can't ship without real avatars.** Checked all three profile tables (`profiles`, `public_profiles`, `freelancer_profiles`) — none has an avatar/photo column. Every seller surface that shows a person — the v3.7 `ServiceListingCard`, `FreelancerCard`, D4 public profile, D2 service detail's freelancer row — falls back to the initial letter. Acceptable as a stopgap, but a photo-led freelancer marketplace reads as broken without real avatars. **Fix = schema + storage:** an `avatar_url` column on the profile the card reads (must be exposed on the cross-user `public_profiles` view — never leak owner-only columns), a Supabase Storage bucket + RLS for uploads, and upload UI in H3/mon-compte. **Own discovery-first migration PR.** Trigger: before the freelancer world / D4 ship for real.

### Reconcile the services category taxonomy (3 lists disagree)
- **What:** The category filter on `/marche/services` reads the **DB `categories` table** (`lib/marche/filter-categories.ts`, scoped to categories with ≥1 active listing — ~6 today). This does **not** match either (a) the Figma / `docs/design/taxonomy-services.md` **13 parents**, or (b) the untracked `src/lib/taxonomy/service-categories.ts` **10 sectors** (not wired to anything). The DB holds 14 flat, product+service-mixed parents. The rebuild deliberately kept the DB-driven list (restyled into the new single-select dropdown) rather than hardcoding the 13 — because `searchMarketplace` filters via `.in('slug', …)`, so a hardcoded label derives a slug (`"Développement web & mobile"`→`developpement-web-mobile`) matching **no DB row** (`developpement`) → a filter that looks right and returns nothing.
- **Why deferred:** Aligning the DB to the 13 parents is a schema migration (rename/insert/reparent categories + reslug + backfill listing `category_id`s) — approval-gated, discovery-first, out of a frontend rebuild's scope.
- **Trigger:** A dedicated taxonomy-migration PR before the services catalog is seeded for launch.

### Add a Ville (city) filter to the services browse
- **What:** The Figma filter bar (611:45644) includes a **Ville** dropdown; the rebuild **omits** it (a disabled/dead control teaches the wrong thing). No `ville` param exists in `lib/search/search-params.ts` and no city clause exists in `searchMarketplace` — wiring it is genuine data-layer work: a new URL param, a `.eq`/`.in` on `freelancer_profiles.city` (also on `public_profiles.city`), and a city-list source (distinct active-listing cities, or the 7 Tunisia anchor cities).
- **Why deferred:** Out of scope for rebuild #1 (UI replacement); it expands the data layer.
- **Trigger:** When city filtering is prioritized — fold into both `/marche/services` and `/recherche` together (shared search layer).

### Service `tags` are near-empty → card falls back to a category chip
- **What:** The v3.7 card shows up to three **skill chips** sourced from `service_listings.tags`. The column exists but ships mostly empty (7 of 8 active listings today are `[]`), so `ServiceListingCard` falls back to a **single category-name chip** when `tags` is empty — real data (the category) in a slot meant for skills, a stopgap so cards aren't blank (flagged in-code).
- **Why deferred:** Backfilling tags + making them required is a create/edit-flow change, not a browse-page change.
- **Trigger:** Make `tags` required (or strongly prompted) in **H6 (create service) / H7 (edit service)**; once real listings carry tags, **remove the category-chip fallback** in `ServiceListingCard`.

### Sidebar IA drift surfaced by the v2-shell adoption (feat/rebuild-marche-services)
- **✅ "Mes annonces" → /mes-missions vocab drift — RESOLVED (`feat/annonces-vocab-rename`,
  completed by `fix/annonces-dangling-imports`).** The route moved to `/mes-annonces` (permanent
  redirect from `/mes-missions/:path*` in `next.config.ts`) and every user-visible string on the
  three pages behind it — list, create, detail — now says "annonce" too, matching the sidebar
  label. "mission" stays reserved for the freelancer-facing job board (`job.*` i18n keys,
  unrenamed). ~~The sidebar item added per Figma `611:45637` is labelled "Mes annonces" but routes
  to `/mes-missions` (the job-posting list). Reconcile the vocabulary (annonces vs missions) in a
  naming pass; not renamed in the shell PR to avoid moving a live route. Lives in
  `sidebar-items.ts`.~~
  **Correction (2026-08-18):** the "RESOLVED" claim above was premature. `feat/annonces-vocab-rename`
  only finished the *create* page's dictionary and routing; the **list** (`mes-annonces/page.tsx`)
  and **detail** (`mes-annonces/[id]/page.tsx`, `AnnonceDetail.tsx`, `AnnonceCard.tsx`,
  `annonce-detail.ts`) pages were `git mv`'d but left internally un-renamed — dangling imports
  (`MissionForm`/`MissionDetail`/`MissionCard`/`getMyMissions`, 12 `tsc` errors on `main`) and
  ~35 deleted i18n keys (`mesmissions.*`, `missions.detail.*`, `mission.error.*`,
  `mission.form.*`, `job.my_missions_title`, `job.whatsapp_consumer_to_responder`) rendering raw
  key strings to real users on every field of both pages. `fix/annonces-dangling-imports` is the
  PR that actually finished the rename: renamed the internal identifiers to match, pointed every
  reference at the `annonces.*`/`mesannonces.*`/`annonce.*` keys that PR-A had already created,
  added the one genuinely-missing key (`annonces.detail.modify`), and got `main` back to a clean
  `tsc`. Lesson: a route/file rename is not evidence the code inside was updated — verify with
  `tsc --noEmit`, not just `git status` on the renamed paths.
- **/statistiques is now nav-orphaned.** "Statistiques" was removed from the shell sidebar (absent
  from the Figma). The `/statistiques` page still exists and builds, but the shell was its only nav
  entry — it's now URL-only until it gets its own IA decision (a freelancer-stats surface). Don't
  delete the route without that decision.

### Scope-A deferrals from the services rebuild (UI parity, no data)
- **Freelances lens:** the Services/Freelances toggle renders with Freelances **disabled ("bientôt")** — the Freelances view + its data layer + cards + `/freelance` pages don't exist yet. Trigger: the freelancer-world build.
- **Grid/list view toggle:** the Figma filter bar has a grid/list display toggle; the rebuild ships **grid only**. Trigger: if a list density is wanted post-launch.
- **AR Phase 8 residue:** `listing.service.{deliveryTime,by}` (unused by this page) and the broader `/recherche` + `marche.*` French placeholders remain — this PR localized only the keys `/marche/services` renders. Trigger: the Phase 8 AR pass. (`relativeAdded` — the third key in this original list — was deleted in feat/i18n-plurals: dead code, no caller, French-only value.)

### Avatar migration (F2) — one off-scale site + a vestigial prop chain
- **MissionDetail responder avatar is 48px — off the measured scale.** The proposal-responder avatar in `src/components/marche/MissionDetail.tsx` (~L329) is a 48px ad-hoc `bg-brand-blue-800` initials circle using a **local** `initials()` helper (not the deleted `getInitials`). The shared `Avatar` has six Figma-measured sizes — 24/32/40/56/80/120 — and **no 48px**. It was left ad-hoc rather than forced to `md`(40)/`lg`(56): inventing a 7th size violates "measure, don't describe," and MissionDetail is legacy (H10, pre-v2) and does **not** consume the compound API this PR deletes, so nothing forces it. **Why deferred:** no clean size mapping + legacy screen. **Trigger:** the freelancer-missions rebuild — migrate to the shared `Avatar` fallback then (or measure a 48px size into Figma first if the design calls for it).
- **AccountMenu `fullName` prop is now vestigial.** `src/components/layout/AccountMenu.tsx` accepted `fullName` only to derive initials; the trigger now renders the shared `Avatar`'s decorative person-glyph fallback (no image data source). `fullName` was kept in the prop type (still passed by `Header.tsx:184`, type-checks) but is no longer read — removing it would ripple `AccountMenu ← Header ← Header's callers`, out of scope for an avatar migration. **Why deferred:** the prop-chain unwind is a separate refactor. **Trigger:** when the legacy `Header`/`AccountMenu` is retired (blocked on the landing/recherche/categories rebuilds).

## F3 primitives — Button · Input · StatusPill (from feat/f3-primitives-batch-1, 2026-07-26)

F3 was **build-only**: the three primitives were built and brought under the gate; **no call site was migrated**. The bespoke implementations keep working. This section is the F-next migration + the Figma authoring gaps surfaced while reconciling.

### Migrate call sites to the F3 `Button` (~30+ bespoke buttons)
- **What diverges from the primitive** (all measured while mining): **5 ad-hoc variant styles** (primary `bg-brand-blue-600`; danger `bg-red-600`/red-outline; secondary `border-gray-300`; blue-outline admin-claim; green-outline unsuspend); **5 radii** — `rounded`(admin family), `rounded-md`(`CopyableEmail`), `rounded-lg`(menu rows), `rounded-xl`(auth `field-styles.ts:15`), `rounded-full`(marche: `MissionDetail`, `MissionForm`, `ContactForm`, `error.tsx`, `ParametresForm`, `ExportDataModal`) → the primitive standardizes on `rounded-lg`; **3 disabled opacities** (`opacity-50` admin+`Favorite`, `opacity-60` consumer/`MissionDetail`, `opacity-70` auth) → the primitive recolors instead; **5 loading idioms** (label-swap, spinner+label, success-glyph, `useTransition`, `useState`) → the primitive's `loading` prop unifies; **~7 danger sites** (`bg-red-600` → `danger-500`/`700`).
- **The clearest single win:** `aria-busy` was set on **exactly one element repo-wide** (`LanguageToggle`); every bespoke action button (auth submits, admin, modals, `MissionDetail`) spins without announcing busy to assistive tech. Migrating to `<Button loading>` fixes this everywhere.
- **Why deferred:** call-site migration is its own reviewable surface (and each migration is a visible change — e.g. marche's pill buttons become `rounded-lg`). **Trigger:** per-surface rebuilds; do the auth funnel and the admin family as two focused passes.

### Migrate call sites to the F3 `Input`
- Auth funnel (`src/components/auth/field-styles.ts`) is the de-facto Input: `rounded-xl` (primitive is `rounded-lg`) and **navy-context label/helper/error colors** (`text-white` / `brand-blue-200` / `red-300`) that assume the AuthShell navy background. The primitive is built for a light surface (Figma). Migration must pass a context override for the navy labels, OR the AuthShell adopts a light field area. **Trigger:** auth-funnel rebuild. Consumer/admin textareas migrate with their forms.

### Migrate call sites to the F3 `StatusPill`
- Live: `src/app/admin/utilisateurs/page.tsx:34` `StatusBadge` uses raw `bg-green-50 text-green-700` / `bg-red-50 text-red-700` (not the `success`/`danger` tokens) and `px-2 py-0.5 font-medium` (primitive is `px-3 py-1 font-semibold`). Swap to `<StatusPill status={…}>{tr(key)}</StatusPill>`. Most other status renders live in the still-unwired dashboard tree. **Trigger:** admin polish + dashboard wiring.

### Figma authoring gaps surfaced by F3 (owed by design, not code)
- **Button danger hover/pressed render `#808080` grey** while bound to `$danger/500` — a placeholder painted over a live binding; there is no valid darker-red. Code uses `danger-700`. *Owe:* real hover/pressed danger values.
- **Button link variant has no Figma hover treatment.** Code adds `hover:underline`. *Owe:* a hover.
- **Button `badge(bool)` prop** is in the registry but no variant demonstrates it and no call site needs it — **not built**. *Owe:* a demonstrated design, or drop the prop from the registry.
- **Button focus renders `#808080`** (bound `$blue/600`) — cosmetic placeholder; code correctly uses `FOCUS_RING`. *Owe:* repaint the focus stroke to its bound value.
- **Button padding was never encoded** — every variant is a fixed 120px demo width, so the label insets are a centering artifact. Code uses token-scale `px-3/4/6`. *Owe:* real horizontal padding per size.
- **Button label weight — RESOLVED in F3 (Figma source corrected).** The label weight was an unset default: `Inter Regular`/400, with **0 of 42 labels binding a fontWeight/fontStyle variable** (only `fontFamily`), inconsistent with StatusPill (Semi Bold) and the ~40 call sites (medium/semibold). Per founder direction the **Figma source was fixed first** — all 42 labels set to Semi Bold (600) via figma-cli — then the primitive built to `font-semibold`. Not owed; recorded because F3 edited the design source.
- **Input `success` state renders a neutral `border-strong` border** — visually identical to default; success is not distinct. Code follows Figma. *Owe:* a green success border/icon if success should read as distinct.

### VRT capture — Windows-local Storybook-boot flake (observed; not reproduced on CI Linux)
Spot-checking the F3 stories locally on **Windows** headless Chrome, individual stories intermittently screenshot **blank** (~99% diff) — and it hit *different, unrelated* stories each run (e.g. `input-affordances`, which has no touch-target span), so it is a capture race, not a component regression: the large Storybook JS chunk occasionally finishes rendering after `scripts/vrt/capture.mjs`'s post-load settle. **On CI Linux the same push captured all 32 stories cleanly** (F2 also measured a 0.000% floor there), so the shared `capture.mjs` was deliberately **not** changed — a behavioural change to it would force a full re-baseline of every story on Windows-only evidence. **Trigger:** if the flake appears on CI Linux once the F3 baselines exist, add a bounded wait-for-content poll (e.g. `#storybook-root` has rendered children) to `capture.mjs` before the screenshot, then re-baseline. **Why deferred:** no CI evidence yet; changing the shared harness speculatively is the wrong trade.

### The 3 off-token interactive-surface shadows (still owed, carried from F2)
- `src/components/ui/interactive-surface.ts` lines 19/23/29 carry custom off-token shadows with no Figma equivalent (grandfathered with `eslint-disable`). F3 was scoped to the three primitives and did **not** resolve them. Full context + the two resolution paths are in `docs/f2-state.md` §"3 — F3 founder decision owed". **Trigger:** a founder decision on the shadow scale (map to an existing `--shadow-*`, or author new shadow token[s] via the Figma → token pipeline).

## F4a — seller_type resolver (from feat/f4a-seller-type-resolver, 2026-07-26)

### Four separate reads of the SAME current-user profile per render (the real perf item — F4b)
`getShellUser` (`lib/marche/shell-user.ts:18`), `getDashboardProfile` (`lib/dashboard/data.ts:26`), `getCurrentProfile` (`lib/marche/mon-compte.ts:28`), and the homepage (`app/page.tsx:37`) each issue their **own** `.select(…seller_type…)` against `profiles` for the signed-in user — up to **four round-trips for one profile per render**. This is the genuine redundancy F4a did **not** touch: F4a centralized the role *derivation* (9 sites → the `@/lib/roles` resolver), not the *fetch*. Two of the four are `cache()`'d within a request, but across the shell + page + rail they don't dedupe. **Why deferred:** unifying the current-user profile read belongs with the two-shell consolidation. **This is F4b scope** — recorded now so it survives if F4b slips. **Fix idea:** one `cache()`'d current-user profile reader the shell + page + rail all call; and when a role-ONLY need first appears, add `getUserRole()` to `@/lib/roles` (the pattern is documented in that file) rather than an 8th ad-hoc select.

## /marche/services Phase 2 — follow-ups (from feat/marche-services-rebuild, 2026-07-26)

### 🔴 The Figma radius scale is in `:root` but NOT in `@theme` — `rounded-lg` is still 8px
- **What:** `src/styles/tokens.css` (generated from Figma) defines the canonical radius ramp,
  including **`--radius-lg: 10px`**, but it emits them into **`:root`**. Tailwind v4 only turns a
  custom property into a utility when it is declared inside **`@theme`**, and `globals.css`'s
  `@theme inline` block adds only `--radius-card` / `--radius-pill` — its comment says so
  explicitly: *"Semantic spacing/radius/shadow aliases (distinct names; **no built-in scale
  overridden**)"*. So **`rounded-lg` still resolves to Tailwind's built-in 8px**, and the DS token
  at 10px is unreachable from a class name. Same mismatch for `--radius-md` (8px token vs. the
  built-in `rounded-md` 6px).
- **Consequence:** every surface the Figma measures at radius 10 — sidebar nav items, the topbar
  search + icon buttons, the filter-bar controls, the lens-toggle track, the card CTA — must ship
  `rounded-[10px]`. Swapping those to `rounded-lg` looks like a free token cleanup and is actually
  a silent **2px regression**; nothing catches it (the boundary lint gates colour, not dimension,
  and the build stays green). This is the `docs/design/marche-services-measurements.md` gap #1,
  now diagnosed to its root cause.
- **Why deferred:** the fix — wiring the generated radius scale into `@theme` (or adding a
  distinct-name alias such as `--radius-control: 10px`, following the `--radius-card` precedent) —
  **retunes 34 existing `rounded-lg` call sites by +2px**, including the F3 `Button` primitive,
  whose VRT baselines are committed at the 0.05% threshold. That is a guaranteed gate break and a
  full re-baseline: a DS PR, not a page rebuild.
- **Related, check when doing it:** F3's `Button` standardizes on `rounded-lg`. If the Figma
  measured its radius at 10, the merged primitive already carries this same 2px delta.
- **Trigger:** a DS radius/token PR that can afford the re-baseline.

### ServiceCard off-token values with no DS equivalent
- `h-[279px]` (measured card height) and `text-[17px]` (measured price size) in
  `ServiceListingCard.tsx` have **no token to map to** — forcing them onto a near tier would be
  worse than a documented raw value, and neither fails CI. Retained deliberately, commented in
  place. **Trigger:** re-evaluate when the type ramp gets its Figma pass (typography is still the
  documented token gap — see `docs/frontend-audit.md`).

### Consolidate `ServicesLensToggle` into the shared `SegmentedControl`
- **What:** `ServicesLensToggle` is a bespoke parallel toggle. It was deliberately **kept** in
  this PR: the shared `src/components/ui/segmented-control.tsx` supports neither a **disabled
  option** nor a **"Bientôt" badge**, and both are load-bearing while the Freelances lens is
  deferred. Adding them is component work that would block a page build.
- **Trigger:** the F3 Segmented reconciliation batch (see the parked inventory below) — add
  disabled-option + badge + per-option icon support there, then migrate this toggle.

### `service_listings` has no `is_published` column — the publish gate is `status='active'`
- **What:** Verified against the live schema: `service_listings` carries `status text NOT NULL`
  (plus `admin_hidden_at`) and **no `is_published`**. Every consumer surface gates on
  `status = 'active'`. The locked two-CTA **Save / Publish** model assumes an `is_published` flag
  per publishable entity, so draft-vs-published is currently encoded in `status` values rather
  than a dedicated column.
- **Why deferred:** reconciling the two is a **schema migration** (add the column, backfill from
  `status`, update every read path + RLS), approval-gated and discovery-first — not a frontend
  rebuild's scope.
- **Trigger:** before H6/H7 (create/edit service) ship their real two-CTA footer; fold in the
  equivalent `products` gate so both catalogs move together.

### Ville filter — mobile parity + /recherche exposure
- The desktop `ServicesFilterBar` now has a **Ville** dropdown; the mobile `SearchFiltersSheet`
  does **not**. That sheet is **shared with /recherche**, so adding a city control there changes
  two surfaces at once and needs its own pass. The `ville` param itself lives in the shared
  search layer and already applies on /recherche if hand-typed (and now counts in
  `searchHasFilters`), it is simply not exposed in that UI yet.
- **Trigger:** fold Ville into the shared filter sheet when /recherche gets its rebuild.
- **Known ambiguity in the empty state:** the control is hidden when `cities` is empty, and
  `getServiceCities()` also returns `[]` on a **query error** (logged, per the never-a-silent-
  empty-list rule). So a transient failure removes the Ville dropdown while Catégorie and Prix
  still render — it reads as "this page has no city filter" rather than "degraded". Deliberate
  (it beats a dead control), but do not mistake a missing Ville dropdown for a regression:
  check the server log for `[filter-cities]` first.

### Avatar placeholder grey (`#cbd5e1`) has no semantic token
- The Figma topbar avatar fill is **#cbd5e1**; the DS `--surface-placeholder` is **#f4f4f4**. The
  F2 `Avatar` primitive's person-glyph fallback already paints `bg-border-strong`, which **is**
  #cbd5e1 — a *border* token used as a background. It wants a slate/300 primitive, and the slate
  ramp is already logged as missing in the token inventory. **No raw hex was introduced**; the
  topbar avatar keeps the primitive's Figma-measured `initials` variant (brand-blue-100 /
  brand-blue-600) rather than being repainted, because the fill lives inside the F2 primitive and
  changing it would re-baseline the F2 VRT snapshots.
- **Trigger:** the DS pass that adds the slate ramp — then give the fallback a real
  `avatar-placeholder` surface token and drop the border-token-as-background.

## F3 batch 2 — Segmented + Select reconciliation (PARKED; inventory from feat/f3-batch2-select-segmented)

The branch's build stalled on the flaky figma-cli bridge; its Phase-1 inventory is preserved here so it survives the branch deletion. Both primitives exist in `src/components/ui/` but were **never measured against Figma → not reconciled** (F3-style). Reconcile in a later batch; the /marche/services rebuild consumes them as-is and inherits the fix.

- **Segmented** — `src/components/ui/segmented-control.tsx` (`'use client'`). Controlled (`value`+`onChange`); `role="tablist"`/`"tab"` + `aria-selected` + `aria-label`; Motion `layoutId` sliding pill + `useId` instance isolation; reduced-motion snap; `FOCUS_RING`; all tokens (`bg-surface-pill` track, `bg-brand-blue-600` active pill, `text-white`/`text-text-muted`, `rounded-full`, `px-4 py-1.5 text-sm font-medium`, `min-w-20`). **2 real consumers:** `SharedSearchBar.tsx:101`, `ParametresForm.tsx:99`. **Keyboard gap:** native `<button>` gives Tab + Enter/Space, but **no arrow-key roving** (the ARIA tabs pattern owes roving `tabindex` — confirm against accessibility.md when reconciling). **Not a consumer:** `ServicesLensToggle` is a *parallel bespoke* toggle (`rounded-lg`, static white pill, disabled "soon" Freelances + badge, per-option icons). **Figma `93:2707`** (18 variants: count[2,3,4] × state[default,focus] × selected, props label1-4 + **icon1-4**) → the primitive **lacks per-option icons** (in Figma, not code → build on reconcile).
- **Select** — **no reconciled Select primitive exists.** `ServicesFilterBar` builds its 4 triggers ad-hoc on `ui/dropdown-menu` + `ui/popover` (+ `ui/filter-control`), none reconciled. Figma: Select — Trigger `72:1051` / Panel `72:1094` / Option `72:894`; Filter Bar `150:10825`; Range Slider `143:9517`.
- **Node IDs for eventual measurement:** Segmented `93:2707`, Filter Bar `150:10825`, Select Trigger `72:1051` (+ Panel `72:1094`, Option `72:894`), Range Slider `143:9517`, Service Card `124:6200`, Pagination `188:14219`, empty state `611:47916`, frame `611:45637`.
- **Bridge note:** the figma-cli CDP bridge (`connect`) drops after ~1 command and Figma MCP is capped at 6 calls/month on the free Starter plan (not viable). The **Figma REST API** (`GET api.figma.com/v1/files/:key/nodes?ids=…`, `X-Figma-Token`) returns raw `padding`/`itemSpacing`/`absoluteBoundingBox`/`boundVariables` over plain HTTPS with no plugin — the robust path for future measurement (variable *names* still need the CDP bridge or a paid tier; the `/variables/local` name endpoint is Enterprise-gated).
- **⛔ BRIDGE NOTE SUPERSEDED (2026-08-03): the CDP bridge is DEAD, not flaky.** On Figma **126.7.10** the app ignores `--remote-debugging-port` outright — verified from a clean slate (unpatch → all Figma + `figma_agent` processes held down to zero → `figma-cli connect`, which printed `✔ Figma configured` and launched the app ITSELF with the flag on its command line): port 9222 never binds, `netstat` empty, `/json/version` refuses. No relaunch race, no stub-vs-versioned ambiguity — the flag is simply not honoured, so **every recovery recipe in the memory notes is inapplicable on this build** and further transport variations are wasted effort. The **claude.ai Figma MCP is now the primary measurement surface** (file key `jDNjJ8D1gnXiW7Ry3GkN4U`); its Starter quota **does reset on a rolling window** (exhausted 08-01, working again 08-03). It returns geometry only — no padding, itemSpacing, fills or bound variables — so the **REST API above is the fallback for those**, and it is the only route back to a full measurement short of a future Figma build that re-honours the flag.

### 🔴 ~~G9 price breakdown — type/colour owed a REST read~~ → SUPERSEDED 2026-08-03. NOTHING WAS OWED; TWO VALUES SHIPPED WRONG

**This entry was wrong when written, and the correction is a defect, not a doc tidy.** It claimed colour and the Total's height "owe a REST read." They do not: **`docs/design/g9-deltas-2.md` lines 292-295 already carried the full measured `priceBreakdown` spec**, taken off a live plugin-bridge read on 2026-07-30 — a week before the block was built. The build did not consult it. What that spec says, against what shipped:

| node | Figma (g9-deltas-2 §panel-produit) | shipped in PR #107 | verdict |
|---|---|---|---|
| row 1-2 **labels** | 16/26 Regular `#475569` | 16/24 · 400 · `#475569` | ✅ colour right |
| row 1-2 **values** | 16/26 Regular **`#0f172a`** | 16/24 · 400 · **`#475569`** | 🔴 **wrong tier** |
| Total label + value | 16/25 **Inter Bold** `#0f172a` | 16/24 · **600** · `#0f172a` | 🔴 **wrong weight** |
| Divider | 704×1 `#e2e8f0` | 1px `rgb(226,232,240)` | ✅ |

Both are filed with IDs in **`docs/design/g9-deltas-3.md` (PB-1, PB-2)**. The 25-vs-26 question is also answered there and the answer is **not** the font-metric-rounding hypothesis this entry offered: 25 is the line-height of the **Bold** Total row against the Regular rows' 26. ⚑ **`src/app/commandes-recues/[id]/page.tsx` still asserts the rounding hypothesis in its call-site comment** — owed a correction whenever PB-1/PB-2 are closed.

**What does survive:** the size derivation. `text-body` (16px) was reached from `leading/body = 26` plus advance-width RMS 1.19px at 16px vs 9.02px at 14px — and pass 2's independently-measured `16/26 Regular` confirms it exactly. The two-channel method was sound; the mistake was not reading the delta file that already had the answer.

**Method rule this earns:** before measuring a G-series region, grep `docs/design/*-deltas*.md` for the node id. Three passes of measurement already exist and they are not indexed anywhere else.

**Also owed (pre-existing, wider than G9):** money is interpolated raw into `"{price} TND"` platform-wide (`seller.orderDetail.unit_price`, `seller.dashboard.tile.profit_value`, and now the breakdown's `price_amount`), so `12.5` renders `12.5 TND` rather than the French `12,50`. The i18n skill's `formatTND` helper (locale-aware `toLocaleString`) exists in the skill doc but **not in the codebase**. Out of scope for one panel; it wants one pass across every money string.

### 🔴 The VRT story gate is NON-FUNCTIONAL on this machine — it fails everything, so it detects nothing

Found 2026-08-03 while checking whether the `--text-body--line-height` fix needed a rebaseline.

`node scripts/vrt/stories.mjs check` reports **max 99.87%, all 32 stories FAIL** — including
`tokens-smoke`, Avatar and StatusPill, none of which use `text-body`. **A negative control settles
it:** with the token change reverted the gate returns **byte-identical 99.87%**. The committed
`__baselines__` therefore do not correspond to this machine's rendering at all — consistent with
`stories.mjs`'s own note that *"the measured Linux story-level floor is 0.000%"*, i.e. they were
captured on Linux/CI while this is Windows.

**Consequence: the gate is worse than absent.** A gate that fails unconditionally cannot
distinguish a real regression from its own noise, and the natural response — "just rebaseline" —
would commit **Windows** baselines over the Linux ones, greening it here while breaking it for CI
and everyone else. **No rebaseline was taken, deliberately.**

**How to get a real answer meanwhile** (used for the token change, and it works): capture twice on
the SAME machine and diff those, bypassing the baselines entirely —

```
node scripts/vrt/stories.mjs check          # before — copy scripts/vrt/__current__ aside
<make the change>
node scripts/vrt/stories.mjs check          # after
THRESH=60 node scripts/vrt/diff.mjs <saved-before-dir> scripts/vrt/__current__
```

That returned **max 0.000% across all 32** for the line-height change — the token moves none of the
VRT'd primitives, which is why this PR ships no baseline churn.

**Fix wants a decision:** either pin baseline capture to one platform (a CI job that regenerates
them, so local runs are advisory only), or make the harness platform-aware (per-platform baseline
dirs). Until then treat a local `stories.mjs check` result as meaningless and use the
capture-twice-and-diff method above.

### 🔴 `/commandes-recues/[id]` overflows 58px at 375 — PRE-EXISTING, surfaced by the G9 breakdown gate

Measured on the authenticated route with a real seeded order (`documentElement.scrollWidth 433` vs `clientWidth 375`). **Neither offender is the price breakdown** — its rows are not in the list:

- **`OrderRail` steps** — `flex w-14 shrink-0 flex-col items-center gap-2 lg:w-20`, rightmost edge **433**. A product order's chain is **7** stages; 7 × 56px + gaps exceeds 375 and `shrink-0` forbids any give. Shipped in PR #105 (rail timestamps). A service order (4 stages) would not overflow, which is likely why this was never seen.
- **Topbar avatar cluster** — `flex shrink-0 items-center gap-4`, rightmost edge **431**. **✅
  RESOLVED — `fix/appshell-topbar-and-pitch-pages`, 2026-08-13** (see the G6/G4 entries for the
  fix). This route's overflow is now **`OrderRail`-only** — re-measure the actual remaining number
  next time this route is touched; it was not re-measured as part of this PR (the fix was verified
  on other AppShell routes, not this specific auth-gated order-detail page).

This is **not covered by** the frontend audit's "380px 0-overflow (negative-control validated)" finding — a different viewport, and more to the point that sweep could not reach the 12 auth-walled routes. Both offenders here exist *only when authenticated* (the rail's 7 product stages, the topbar's name+role avatar cluster), so an anonymous sweep could not have seen either. Treat the audit's overflow result as covering anonymous routes only.

**`OrderRail` still not fixed** — it is a previous PR's element and the fix is a real responsive decision (horizontal scroll vs a condensed mobile rail vs wrapping), not a one-liner. Only the topbar half of this entry's overflow is resolved.

### 🟡 `scripts/gate/authed.mjs` cannot set the language cookie — AR half of the visual gate is unreachable through it

`authed.mjs` injects only the session cookies, so there is no way to ask for an Arabic render; every authenticated gate run is implicitly FR. The G9 breakdown's AR/RTL capture needed a throwaway scratchpad runner that imports `mintGateCookies` and adds one `Network.setCookie` for `servyou_lang`. **Fix is ~4 lines** (a `--lang` flag setting that cookie before navigate), deliberately not taken inside a one-panel PR. Until then, any "gated in both languages" claim about an authenticated route is false unless the run says otherwise.

## Visual-gate findings — v2 shell at 375px (from feat/marche-services-rebuild, 2026-07-26)

Surfaced by the 375px gate run over the shell's blast radius. All three are **pre-existing**
(verified against `2a911f5^`), so per Standard G they are logged, not fixed in the shell PR.

### 🔴 12 of the 20 v2-shell routes cannot be gated without an authenticated session
- **What:** `AppShell` is mounted at **20** sites (19 `page.tsx` + `ServicesBrowsePage`). Only
  **/marche/services, /marche/produits, /services/[id]** render it anonymously — the other 12
  workspace routes 307 → `/connexion`. `AppShell` does render logged-out (consumer IA, per its own
  header comment), so the shell *code path* is exercised; what is **not** reachable is the
  **`freelancer` and `shop_owner` sidebar variants** and every workspace page's content reflow.
- **Consequence:** a sidebar regression that only manifests in a seller IA — a wrong section cap, a
  clipped nav on a short viewport, a role-specific item — **cannot be caught by an anonymous gate**,
  and there is no VRT story for any shell component either (the 32 baselines are F2 `Avatar` + F3
  `Button`/`Input`/`StatusPill` only). The shell is the single most-shared surface in the app and is
  currently the least gate-covered.
- **Fix (two options, not exclusive):** (1) a seeded **gate account per `seller_type`** + a scripted
  login so the sweep can reach the workspace routes; (2) **Storybook stories for `Sidebar` /
  `SidebarItem` / `SidebarSection` / `Topbar`** at the three roles × 375/1440, which brings the shell
  under the existing VRT gate and needs no session at all. (2) is cheaper and catches more.
- **Trigger:** before the next shell-touching PR — this gap recurs on every one.

### Topbar language toggle is a 24px touch target
- `src/components/layout/LanguageToggle.tsx:64` renders each FR/AR button at `h-6` (**24px**;
  measured 41×24 and 43×24 at 375px) with **no hit-area expander**. The touch-target rule requires
  ≥44×44. Pre-existing — `h-6` is byte-identical in `2a911f5^`; that commit only changed the
  active/idle colours. The fix is the F3 pattern already used next to it: an
  `absolute -inset-*` `aria-hidden` span (see `TopbarUserMenu.tsx:52`,
  `TopbarNotifications.tsx:34`), which keeps the measured 24px box while giving a 44px hit region.
- **Trigger:** the touch-target code pass, or the next topbar-touching PR.

### `TopbarSearch` input is 14px → iOS zoom-on-focus (second instance)
- `src/components/shell/TopbarSearch.tsx` ships `text-body-sm` (**14px**), below the 16px iOS
  threshold, so focusing it zooms the viewport on iPhone. This is the **same defect already logged
  for `SharedSearchBar.tsx:99`** — now confirmed on the v2 topbar too, i.e. it affects every one of
  the 20 shell routes, not one component. Pre-existing: `text-body-sm` is unchanged across
  `2a911f5` (that commit swapped `cn()` for a plain template precisely to *stop* tailwind-merge
  dropping the size, and to move the radius to `rounded-[10px]`).
- **Note for whoever fixes it:** bumping to 16px is a **visible** change to the topbar and the
  measured Figma value is 14 — so it needs a design call (16px input text, or a 16px override only
  under `max-lg`), not a silent token swap.
- **Trigger:** fold both instances into one pass — the component audit already scoped for
  `SharedSearchBar`.

### `/categories/[slug]` renders empty while the DB has active listings
- `http://localhost:3000/categories/marketing` renders **"Aucune annonce dans cette catégorie"**,
  but the database reports **5 active `service_listings`** for that slug:
  `select c.slug, count(sl.id) from categories c left join service_listings sl on
  sl.category_id = c.id and sl.status = 'active' group by c.slug` → `marketing = 5`. The page
  resolves the slug (it returns 200, not 404), then finds nothing.
- **Pre-existing, not the services-delta branch.** Confirmed by stashing that branch's changes and
  re-requesting the route on clean `main` — same empty state. The only change that branch makes near
  this path is a `className` gap on `ListingResults`, which cannot affect a query.
- **Consequence:** every `/categories/*` landing page is likely dead for services. It also means the
  shared `ListingResults` service grid has **one consumer that cannot be exercised** — the P11 mobile
  gap change was verified live on `/marche/services` and `/recherche` only (the consumer homepage is
  auth-gated).
- **Suspected area:** how `categories/[slug]/page.tsx` resolves the slug to the id(s) it passes to
  `searchMarketplace` — parent-vs-child category id, or a type filter — but this was **not chased**;
  the above is the observation, not a diagnosis.
- **Trigger:** before any `/categories` rebuild, and before anyone relies on that route's numbers.

### Filter-bar search field is 40px where Figma `611:45644` measures 44
- The services filter bar renders its search field at `h-10` (**40px**) while the Figma search
  measures **44**, taller than the 40px selects beside it. Row **P1** of
  `docs/design/marche-services-deltas.md`.
- **Deliberately not fixed.** It was built and then **cut by founder direction**: out of scope for
  the services-delta PR, and 44 makes the search visually inconsistent with the 40px Catégorie /
  Ville / Prix / Trier-par controls sharing its row. Reinstating it should come with a decision about
  whether the *selects* move to 44 too, rather than a lone taller field.
- **Trigger:** whenever the filter row is next revisited as a whole.

### D2 — three deliberate non-builds, so a future pass does not read them as oversights

All three are founder-decided on the D2 build (`feat/d2-service-detail`, Figma `666:55479` /
`668:55920`). None is a defect; each is recorded here because the *absence* is the decision.

- **`revisions_count` is in the data layer with no D2 region — by design.** The column exists and
  is populated on 21/21 active listings, and `getServiceDetail` returns it as `revisionsCount`.
  `666:55479` has **no region for it**, and UI that is not designed does not get invented. It is
  carried for **E1**, where the buyer needs the revision count *before* committing. If you are
  about to surface it on D2, that is a design decision first, not a wiring task.
- **D2 has no gallery region, and the `service_media` fetch was removed.** `service_media` exists
  but holds **zero rows**; the per-service gallery was retired in favour of
  portfolio-per-freelancer, and neither D2 frame has a gallery. The resurrected
  `service-detail.ts` was still selecting it, feeding nothing — dead weight the next reader would
  assume was load-bearing. **If work samples ever return to D2, the Figma design comes first**,
  then the query.
- **The related-services heading diverges from the Figma, deliberately.** The frame reads
  *"Autres services de {freelancer}"*, which assumes a **same-freelancer** rule. The approved rule
  is **category-first** (category → freelancer → newest active, deduped, cap 3), so the set is
  mixed and a freelancer-scoped heading would be factually wrong for most rows. Ships as the
  neutral **"Services similaires"** (`serviceDetail.related`, FR + AR). If the rule ever becomes
  freelancer-only, the Figma heading becomes correct again and this should be revisited.

### `FavoriteButton` is a text glyph where the design wants an icon button
- `src/components/FavoriteButton.tsx` renders a **`p-2 rounded-full text-xl` button containing a
  `♡` / `♥` text glyph** (and a `text-gray-300 ♡` in its loading state). Figma wants a **20px
  stroked icon inside a 44px box**: on D2 the buy box's `icon-heart-btn` is `147×44`, `r=10`,
  stroke `1 #cbd5e1` on white, holding a `20×20` icon at stroke `2 #64748b` (`666:55479`).
- A **text glyph is not a substitute for an icon**: it inherits font metrics rather than a fixed
  box, so it cannot be sized to 20px reliably, its optical weight differs from every other
  `lucide-react` icon in the app, and it renders differently across platforms and fonts.
- **Pre-existing and unrelated** to the D2 width collapse fixed in `fix/d2-panel-deltas` — that
  was a grid-column issue. Confirmed the glyph renders identically in both auth states, so it is
  not an auth-dependent path either.
- **Blast radius — 3 consumers**, so this is not a D2-local fix: `ServiceDetail.tsx` (the D2 buy
  box), `ServiceListingCard.tsx` and `ProductListingCard.tsx` (the card corner hearts, which are
  a different size and treatment again). A per-page patch would fork the component three ways.
- **Fix as part of a proper icon-button pass across the app**, alongside the other two open
  icon-button items already logged here (the `LanguageToggle` 24px touch target, and the F3
  invisible hit-area pattern) — they share a target shape and should land together.
- **Trigger:** the icon-button / touch-target pass, or whenever `FavoriteButton` is next opened.

## E1 / E2 — service request + confirmation (`fix/e1-e2-service-request`)

### `submitServiceRequest` validates by hand, not with Zod
- CLAUDE.md requires server actions to validate input with Zod before any mutation.
  `src/app/demander/[id]/actions.ts` predates that call site being built and validates with
  explicit checks (trim + length floor, `isValidPhone`, `Number.isFinite`). The checks are
  correct and now covered by `src/__tests__/service-buyer-note-roundtrip.test.ts`.
- **Deliberately left alone.** Converting it is a rewrite of shipped, working code and collides
  with *once built, stays built*; the founder's call on the E1 discovery was to log the
  divergence rather than fold a refactor into a page rebuild.
- **Trigger:** whenever the product half of that file is opened for the product E1 rebuild —
  convert both actions in one pass, with the round-trip test as the guard rail.

### `Button` size=lg horizontal padding is 24 in code, 20 in Figma
- `src/components/ui/button.tsx` ships `lg: 'h-12 px-6'`. Every authored `lg` instance in E1/E2
  measures `pad:0,20,0,20` → `px-5` (`680:56469`, `682:56920`, `691:57233`, `691:57244`).
  `md` matches (`px-4` ↔ `pad:0,16`); only `lg` diverges.
- This is **new information**, not a contradiction: the primitive's own comment records that the
  Button COMPONENT_SET authored a fixed 120px demo width, so real padding was never encoded
  there. E1/E2 are the first frames to encode it at the instance level.
- **Not fixed here** — it moves every `lg` button in the app and would fight the VRT baseline.
  E1/E2 use the primitive as shipped.
- **Trigger:** the next primitives pass; change `SIZE.lg` to `px-5` and re-baseline VRT.

### The type scale has no tokens for 13 / 15 / 22 / 26 / 30px
- E1/E2 carry ~25 `text-[15px]` / `leading-[22px]` / `text-[13px]`-style bracket values. These
  are **measured, not guessed**, and match what D2 (`ServiceDetail.tsx`) already ships — the two
  pages sit next to each other and must not diverge.
- The real gap is upstream: `@theme` has no token for these steps, so every page re-types them.
- **Trigger:** the typography-token pass deferred out of F1 (token foundation).

### E2 reads the price live, so a historic order's amount can drift
- `orders` stores **no price column**. E2's récap and `getOrderDetail` both read
  `service_listings.starting_price_tnd` at render time, so if a freelancer edits their price
  after a request lands, the buyer's confirmation shows the NEW figure.
- Acceptable at MVP (the price is explicitly a starting point negotiated on WhatsApp, and E2 is
  read within minutes of submitting) but wrong for any later receipt or dispute surface.
- **Trigger:** the first surface that must show what was agreed rather than what is listed —
  likely E3 order history or the dispute flow. Fix is a price snapshot column on `orders`.

### E2 récap shows one chip where Figma shows two
- `690:57171` renders a category chip plus a tag chip. E2 sources its récap from
  `getOrderDetail`, whose `item` exposes `category` but not `tags`. Widening that read — used by
  order views not being rebuilt here — for a cosmetic chip was rejected as scope creep.
- E1's summary panel does render `[category, ...tags]`, so the two screens differ by one chip.
- **Trigger:** whenever `getOrderDetail` is next extended for E3.

### 375px: the shell top bar overflows the viewport by 56px (PRE-EXISTING)
- At a 375 viewport with a **logged-in** user, `document.scrollWidth` is **431** against a 375
  client width on every page measured: E1 (new), **D2, C1 `/marche/services` and `/marche`
  (all untouched and already merged)** — identical offender, identical 56px.
- Offender is the Topbar's right cluster, `div.flex.shrink-0.items-center.gap-4` (left 219 →
  right 431) holding the 48px avatar button. `shrink-0` on a row that has no room to shrink.
- Harness validated with a negative control before reporting (injected a 9999px div → registered
  +8574), so this is a real overflow, not an `overflow-x` artifact.
- **Not introduced here and not fixed here** — it is a shell defect with every rebuilt page as a
  consumer, and `project_frontend_audit` recorded "380px 0-overflow" from a logged-OUT sweep,
  which is why it was missed.
- **Trigger:** the next `components/shell/*` pass. Re-measure logged-IN at 375.
- **✅ RESOLVED — `fix/appshell-topbar-and-pitch-pages`, 2026-08-13.** See the closing note under
  the G6 entry below for the fix and the full re-measurement; not repeated at every sighting.

### CDP click harness cannot deliver synthetic mouse input (tooling note)
- `Input.dispatchMouseEvent` (mouseMoved → mousePressed → mouseReleased, correct `buttons`,
  hit-tested on-target) delivered **zero** pointer/mouse/click events to the page — verified with
  a capture-phase listener on `document`, and reproduced on an ordinary untouched breadcrumb
  link, which also failed to navigate.
- The E1 create flow was therefore verified through `button.click()` and `form.requestSubmit()`,
  both of which run the real React submit handler; each produced a real `orders` row and a fully
  rendered E2.
- Contradicts `reference_cdp_visual_gate`, which records real mouse events as the way to open
  Radix menus. Whatever changed, **validate input delivery with a control listener before
  trusting a null click result.**

## VRT harness — diagnosability (found on PR #95, run 30290935264)

### `capture.mjs` discards Chrome's stderr, so a launch failure cannot be diagnosed
- `scripts/vrt/capture.mjs:66` spawns Chrome with `{ stdio: 'ignore' }`. When the DevTools
  endpoint never opens, the only evidence left in the job log is `waitFor exhausted` from the
  `/json/version` poll on line 67 (40 × 250ms = a 10s budget).
- **A crash, a sandbox refusal and a merely-slow cold start against a fresh `--user-data-dir` are
  therefore indistinguishable** — Chrome's own explanation was thrown away.
- Observed once so far: PR #95 died 10.14s after the static server came up, on a runner with
  Chrome 150.0.7871.128 and image 20260720.247.2 — **byte-identical to the previous green run**,
  so the log gave nothing to work with.
- **Fix:** pipe Chrome's stderr into the job log (`stdio: ['ignore', 'ignore', 'pipe']` and echo
  it on the failure path, or `'inherit'`). Consider surfacing a non-zero exit from the child too.
- **Trigger:** next time the VRT harness is opened, or the next unexplained capture failure.

### A Chrome launch timeout is reported as "32 stories were deleted"
- When capture produces zero images, the check step compares an empty current set against the full
  committed baseline and prints
  `ORPHAN BASELINE (32) — a story was deleted/renamed; remove these from scripts/vrt/__baselines__`.
- **That blames the author's branch for a harness fault.** On PR #95 the branch added no story
  file at all, and the suggested remedy — deleting all 32 baselines — would have been actively
  destructive if followed.
- The gate line has the same problem: `0 compared / 0 missing / 32 orphan → FAIL` reads as a
  content change rather than "the browser never started".
- **Fix:** distinguish *zero captures taken* from *genuine orphans* before printing. If the
  current set is empty (or the capture step exited non-zero), fail with a harness error and say
  so; only reach the orphan message when captures exist and a baseline has no counterpart.
- **Trigger:** same pass as the stderr item above — they share a root cause and a test case.

## E3 — Mes commandes, Services tab (`feat/e3-mes-commandes-services`)

### Three things the accordion design drops — all candidates for reviving `/mes-commandes/[id]`
Founder direction: `/mes-commandes/[id]` stays a ComingSoon stub rather than being deleted or
redirected, precisely because these three land there later. Deleting it now would mean rebuilding
the route, its i18n block (`fr.ts` / `ar.ts`, "Order detail page") and its `active-route` entry.

1. **Buyer cancellation has no surface, though the DB permits it.**
   `check_order_status_transition` lets a buyer cancel from any non-terminal state
   (`pending` / `accepted` / `arrived`) with `cancelled_by='buyer'`, plus a
   `cancellation_reason` once the order is at `accepted` or later. The Figma body
   (709:59730) offers only WhatsApp + "Confirmer la réception". `CancelOrderModal.tsx`
   already exists and has **zero importers**.
2. **The buyer's own brief is absent, though it is the substance of a service order.**
   E1 collects description / délai / budget, E2 displays them, and `getOrderDetail`
   already unfolds all three from `buyer_note`. The accordion body shows none of it — the
   buyer cannot re-read what they asked for.
3. **Cancelled rows have no designed body.** row-6 (`annulée`) is collapsed-only in both
   frames, so `cancellation_reason` and `cancelled_by` (already bilingual as
   `common.cancelled_by_buyer` / `_seller`) have nowhere to render, and the 4-stage rail has
   no cancelled representation. This build keeps a body for cancelled orders but renders it
   SUBTRACTIVELY — WhatsApp + reference only, no rail, no confirm — rather than inventing one.

### Order reference is a truncated uuid, not a sequence
- Figma meta (709:59733) reads "Commande #CMD-2024-0318". `orders` has 18 columns and **no
  order-number column** — the PK is a bare uuid, so that string has no data source.
- Founder call: **no migration.** Render the uuid's first 8 chars ("Commande #3cf896e1 · Passée
  le 20 novembre 2024") — unique, stable, already exists, zero DB work for a cosmetic string.
- **Trigger:** if support ever needs a human-quotable reference (phone/WhatsApp support reading an
  order number aloud), add a `CMD-{year}-{seq}` generated column. Until then the short uuid is
  strictly better than a migration.

### Two deliberate divergences from Figma 709:59662 — fix the FIGMA, not the code
1. **Label for `arrived`.** The frame says "Livrée" in the rail and "Livré" in the pill — two
   spellings of the same state, in the same frame. The shipped i18n already has
   `common.status_arrived_service` = "Travail livré" / "العمل مُسلَّم", which is correct for a
   service (work delivered, not a parcel) and exists in both locales. Code uses the shipped
   string. **Changing shipped, bilingual i18n to match a Figma authoring bug is backwards.**
2. **Tone for `arrived`.** The frame uses StatusPill `delivered` → tone `success` (green). But
   `reçue` is ALSO `success`, so two adjacent lifecycle states render identically and the buyer
   cannot see at a glance whether they still owe a confirmation. Code uses `arrivee` → tone
   `info` (blue). **Green means done.**
- **Trigger:** next Figma pass on E3 — fix the gender mismatch and repaint the pill.

### The `received` rail renders all four stages completed — a documented choice
- Figma 709:59662 only ever mocks the `arrived` row, so **there is no frame showing what a
  finished order's rail looks like**. This is a decision, not a measurement, and it is recorded
  here because nothing in the design can be pointed at to justify it.
- **Decision (founder, 2026-07-27): a terminal state owes nothing.** `received` renders every
  stage — including "Reçue" itself — in the `completed` treatment (blue-600 fill + white check),
  and the connectors all read `border-strong`.
- **Why not `current` on stage 4:** the `current` treatment (white circle, 2px blue ring, blue
  dot) is the rail's signal for *"you are here, something is outstanding"*. On a received order
  it would imply an action the buyer still has to take, when `check_order_status_transition` has
  already closed the row — `received` is terminal and raises on any further transition.
- Verified across all four states against 709:59712 / 59717 / 59722 / 59727; the other three
  match the frames exactly. Implemented in `stageState()`
  (`src/app/mes-commandes/_components/order-status.ts`).
- **Trigger:** if E3 ever gets a `received` frame in Figma, reconcile against it — and if the
  design disagrees, this reasoning is what has to be argued with.

### `refresh-registry.js` validation cannot detect a screens-less scan
- The wrapper "REFUSES to overwrite a good registry with an error/empty scan", but its guard only
  checks `variables >= 50`. A transient CDP hiccup mid-scan produced a registry with **0 screen
  frames** and an `ERROR reading components` line, and it was written over the good file anyway
  (recovered by re-running once the bridge settled).
- **Fix:** extend the guard to also require a plausible `screen frames` count and to reject output
  containing `ERROR reading`.
- **Trigger:** next time that script is touched. Note both `scripts/figma/` and
  `docs/design/figma-registry.md` are UNTRACKED, so this is a local-tooling item.

### `globals.css` is shared with Storybook — bare element selectors there hit all 32 VRT baselines
- **What happened:** the E3 expand-reflow fix first landed as `html { scrollbar-gutter: stable }`
  in `src/app/globals.css` (`3f42247`). `.storybook/preview.ts:4` imports that file **by design**
  (stories must render through the real F1 token chain), so the rule also applied to every story
  iframe and shifted **all 16 desktop VRT baselines** — max **0.697%** against a **0.05%** gate.
  Storybook renders isolated components on a centred canvas with no page to scroll: there was no
  shift to prevent there, only 15px narrower snapshots forever, for an app-layout reason.
- **Resolution:** the declaration moved to a `[scrollbar-gutter:stable]` class on the app's root
  element in `src/app/layout.tsx`, which Storybook never renders. Same computed result in the app
  (verified: `getComputedStyle(document.documentElement).scrollbarGutter === 'stable'`), zero
  reach into stories.
- **The general rule:** `globals.css` is not app-only. A bare element selector (`html`, `body`,
  `a`, `ul`…) added there is a **global change to the component gate as well**. App-layout
  concerns belong on an app-owned element/class; only tokens and genuinely universal resets
  belong in the shared file. A `@layer`/`:root`-scoped custom property is safe; a styled element
  selector is not.
- **Fix (optional hardening):** either give Storybook a preview stylesheet that imports only
  `src/styles/tokens.css`, or add a lint/CI check that fails on new bare element selectors in
  `globals.css`. Neither was done here — the one-line placement fix is enough for this defect and
  the split-stylesheet change would need its own re-baseline.
- **Trigger:** next time anything is added to `globals.css` outside `@theme`/`:root`.

## Moderation read paths (`fix/moderation-filter`, 2026-07-28)

### `admin_hide_content` hides by two different mechanisms — consider making it cascade
- **What:** the RPC's behaviour is **not uniform across target types**:
  | Target | sets `status='hidden'` | sets `admin_hidden_at` |
  |---|---|---|
  | `product` | ✅ | ✅ |
  | `service` | ✅ | ✅ |
  | `shop` | ❌ (no status column) | ✅ |
  | `freelancer_profile` | ❌ | ✅ |
  | `job_post` | ❌ (**has** `status`, left untouched) | ✅ |
- **Why it is a trap:** hiding a shop or a freelancer leaves **every child listing at
  `status='active'`**. A reader that filters `status` alone therefore catches a directly-hidden
  product but happily lists a moderated seller's entire catalogue. That is exactly the bug
  `fix/moderation-filter` closed on six read paths, and the asymmetry is invisible unless you
  read the function body — the next person will reasonably assume hiding a shop hides its
  products at the row level. It also means `job_post` moderation is *weaker* than it looks: the
  column exists and is deliberately not set.
- **Filtering the parent is the correct fix either way** (a child row is not itself moderated —
  it is hidden *by consequence*, and it must come back if the parent is unhidden), so this is
  logged rather than fixed. But the option is real:
  - **Option A — leave as is.** Parent predicates on every public read path, which is what now
    ships. Unhide is trivially correct. Cost: every future public reader must remember the join.
  - **Option B — make the RPC cascade**, setting `status='hidden'` on children too. Cost:
    `admin_unhide_content` must then restore the *previous* status per child (draft vs active vs
    paused), which needs a stored prior value — a new column or an audit-log read. Strictly more
    state, and it can un-pause a listing the seller had paused themselves.
  - **Option C — push it into RLS**, so the SELECT policy itself excludes hidden rows and their
    hidden parents. Strongest guarantee, and it would have made this whole class of bug
    impossible, but it changes read semantics for the owner/admin paths that legitimately need
    to see hidden rows.
- **Recommendation:** A (shipped) + revisit C when `freelancer_profiles` gets its column-exposure
  migration, since both touch the same policy.
- **Trigger:** next moderation-touching PR, or when `/trouver-des-missions` ships.

### `job_posts` has no public read path yet — the filter is pre-installed as a test, not code
- The public missions board is a `ComingSoon` stub, and the only `job_posts` readers today are
  owner-scoped (`getMyMissions`, `getMissionDetail`, `DashboardRightRail`) where filtering would
  be the bug. So there was no query to fix.
- Instead `src/__tests__/moderation-read-paths.test.ts` asserts that **no non-owner module under
  `src/lib/marche` or `src/lib/search` reads `job_posts`**, and that any module in those
  directories touching a moderated table filters `admin_hidden_at`. Building the board makes
  that test fail until the filter is added — which is the point.
- **Trigger:** when the board is built, filter `admin_hidden_at` on the listing query and delete
  the now-obsolete assertion.

## G4 — Tableau de bord vendeur (`feat/g4-seller-dashboard`, 2026-07-28)

### 🔴 Topbar overflows 56px at 375 — but only when LOGGED IN, on every AppShell route
- **Also reproduced on E1-product `/demander/[id]` and E2 `/demander/succes` (2026-08-10),
  authenticated via `scripts/gate/session.mjs`** — same 56px, same offending element
  (`div.flex.shrink-0.items-center.gap-4`), zero overlap with either page's own content (the
  overflowing elements are all inside the topbar's trailing cluster; nothing from the form, the
  summary, or the recap appears in the offender list). Both routes are auth-gated, so — same
  caveat the entry below already states for 12 other shell routes — they join the set that
  cannot be overflow-tested anonymously; the "logged out ⇒ 0 overflow" claim could not be
  re-confirmed on these two specifically, only inferred from every other page it holds on.
- **Measured on G4 and reproduced identically on the already-shipped `/marche/services`** (which has
  its own 375 Figma frame), so this is a shared-shell defect, not a G4 regression:
  `document.documentElement.scrollWidth` 431 vs `clientWidth` 375 → **56px (FR) / 53px (AR)**.
  Desktop 1440 is clean (0). Negative control: injecting a 9999px div moved the probe to 9624, so
  the 0-at-1440 and the 0-when-logged-out results are measurements, not a blind spot.
- **Culprit:** the topbar's trailing cluster `div.flex.shrink-0.items-center.gap-4` — the FR/AR
  `LanguageToggle` plus the user menu — measures 212px and is `shrink-0`, so at 375 it pushes the
  row past the viewport instead of compressing.
- **Why it was never caught:** logged OUT the same page measures **0 overflow** (the topbar renders
  a single "Se connecter" button instead of toggle + menu). The earlier audit's "380px 0-overflow,
  neg-control validated" finding was therefore correct *and* blind to this — it was measured
  anonymously, and 12 of the 20 shell routes cannot even be reached logged out.
- **Fix (own PR — shell-wide, not G4's to make):** let the cluster shrink (drop `shrink-0`, or hide
  the FR/AR toggle behind the mobile drawer below `sm`, which is where the language control already
  lives on mobile). Re-measure logged in at 375 in both locales afterwards.
- **Trigger:** next shell-touching PR, or before any seller page ships to mobile users.
- **✅ RESOLVED — `fix/appshell-topbar-and-pitch-pages`, 2026-08-13.** Neither of the two options
  above was taken — dropping `shrink-0` was explicitly rejected (would compress the avatar/bell/
  toggle unpredictably instead of the row reclaiming space) and hiding the FR/AR toggle changes
  what the row *offers*, not just what it costs. Fix instead: below `sm`, `Topbar.tsx`'s logo swaps
  the full wordmark (110px) for the icon-only S-mark (32px, the same asset the open drawer already
  uses) and the cluster's `gap-4` (16px) drops to `gap-2` (8px) — both revert at their breakpoint,
  nothing shrinks under pressure. Re-measured logged in, FR and AR, at 375: `scrollWidth ==
  clientWidth`, 0 overflow, on `/tableau-de-bord-vendeur`, `/marche/produits`, `/produits/[id]`,
  `/ma-boutique/creer`, plus the two newly-migrated `/devenir-vendeur/{boutique,freelance}` — AR
  confirmed via a throwaway `Network.setCookie(servyou_lang=ar)` runner (the exact gap the
  `authed.mjs` entry two sections up already logs; not fixed there, same "not this PR" call).
  Desktop 1024/1152/1279/1280/1366/1440 swept clean on the two migrated pages. **S4 (topbar 65px
  vs Figma's 64px) was NOT touched** — the founder's 2026-07-28 "rides with" note for that item
  is still open; this PR's scope was the 375px overflow specifically, not the 1px height delta.

### The ten seller pages have NO mobile Figma frames
- **G1-G9 + D3 are all desktop-only.** The registry holds **13 mobile (375) frames across 160 screen
  frames**, and every one belongs to a consumer/buyer surface: I1, marketplace services (+Freelances
  lens), E1, E2, E3 ×2, D2, F1 produits, K1-K4. D4 and H3 are desktop-only too, so the pattern is
  **the whole seller + profile world has no mobile design**, not a couple of oversights.
- **Consequence:** every below-`lg` value in `app/tableau-de-bord-vendeur/` is DERIVED, not measured,
  and each is flagged `derived:` in-code at its call site (single-column collapse, 1/2/4-up tile
  grid, stacked header, stacked action rows). A later mobile frame will very likely disagree with
  some of them, and that is a re-measure, not a bug report.
- **On a market that is 70%+ mobile**, this is worth sizing as one design batch rather than
  absorbing page-by-page across ten PRs.
- **Trigger:** before the seller world ships to real users.

### `/devenir-vendeur/freelance` joins the no-mobile-frame list — every responsive value INFERRED
- **`466:19958` ("Devenir freelance — 1440") is desktop-only**, same pattern as the ten seller
  pages above — this is effectively an eleventh. Full geometry in
  `docs/design/devenir-freelance-discovery.md`.
- **The value-cards row is the D1 hard-fit shape**: 3 × 229.33px + 2 × 16px gap = 720px, exactly
  the measured column width, zero slack. Built fluid (`BenefitGrid`'s new `columns=3` →
  `grid-cols-1 sm:grid-cols-3`), not fixed-px, specifically to avoid the D1/G1 overflow trap.
- **`sm` (640px) as the 1-up→3-up jump is INFERRED, not measured** — chosen to skip the
  intermediate 2-up step 4-column grids use (`md:grid-cols-2` before `lg:grid-cols-4`), since 3
  items split unevenly into 2 (a 2-then-1-orphan tablet state). No frame exists below 1440 to
  confirm or contradict this.
- **The hero's mobile shape (font-size steps, button wrap behavior) is also inferred** — carried
  from the pre-existing `RoleUpgradeHero` responsive values (`text-4xl md:text-5xl`, `flex-wrap`
  CTA row) rather than measured fresh, since the frame draws no responsive variant at all.
- **Trigger:** whenever this page (or boutique's sibling `555:37032`, likely the same shape) gets
  an actual mobile Figma frame — re-measure against it then, treat any disagreement as a
  re-measure, not a bug.

### `/devenir-vendeur/boutique` joins the same list — a twelfth, same shape as its sibling
- **`555:37032` ("Devenir vendeur (boutique) — 1440") is also desktop-only.** Full geometry in
  `docs/design/devenir-boutique-discovery.md`.
- **Same D1 hard-fit value-cards row**, same fix (`BenefitGrid`'s `columns={3}`), same `sm`
  1-up→3-up breakpoint chosen for the same reason (skips an uneven 2-up tablet step for 3
  items) — INFERRED, not measured, confirmed on this frame too, not re-derived independently.
- **Trigger:** same as the freelance entry above — whenever either sibling gets a real mobile
  frame, re-measure both together rather than reconciling them twice.

### Three buyer-side order transitions still write from client components
- `mes-commandes/_components/OrdersList.tsx:279` and `components/ReceiptConfirmButton.tsx:33`
  (both → `received`) and `components/CancelOrderModal.tsx:81` (cancel) call `supabase.update()`
  directly from `'use client'` components. They are **correct** — RLS plus
  `check_order_status_transition` enforce every rule server-side — but they bypass the standard
  that mutations go through a server action with Zod validation.
- **G4 sets the counter-pattern** (`app/tableau-de-bord-vendeur/actions.ts`: Zod parse → auth →
  ownership re-check → derived target status → DB trigger as final authority). Migrate the three to
  match; deliberately NOT touched in the G4 PR, per one-PR-one-focus.
- **Trigger:** the E3/buyer-orders PR that next touches those files.

### G4 diverges from its own specimen on "Bénéfice net" — deliberately
- Specimen `484:24205` mocks **"2 840 TND / Commandes livrées"**. Shipped code renders
  **"Bientôt disponible"** (muted) instead. `products` has no `delivery_fee`, so a true *net* figure
  cannot be computed, and printing revenue under a net-profit label would be a fabricated metric.
- Note this contradicts the older build note that the tile was already authored as a
  "Bientôt disponible" placeholder — the measured specimen shows a mocked number, so the FIGMA is
  what needs updating here, not the code.
- **Trigger:** the schema PR that adds `delivery_fee` (bundled with `shops.is_published` +
  `freelancer_profiles.is_published` + the order tracking number).

### ⚠ Tailwind's `leading-normal` is the ratio 1.5 — NOT CSS `line-height: normal`
- **The trap:** Figma emits `leading-[normal]` (the CSS keyword, ≈1.21 for Inter). Tailwind's
  `leading-normal` utility is the **ratio 1.5**. Same word, different value, no error either way.
- **Evidence (G4 delta P1):** on the 28px Bold glance-tile value, `leading-normal` computed to
  **42px** where Figma's `normal` is **≈34px** — **+8px per tile**, which pushed the measured tile
  from Figma's 196 to 248 and, combined with a wrapping string, stretched the whole 4-up grid row.
  `leading-[normal]` (bracketed) is the one that emits the keyword.
- **Rule:** when a Figma value reads `normal`, write `leading-[normal]`. Reserve bare
  `leading-normal` for when 1.5 is genuinely intended. Grep before copying either into a new
  component — this reads as a no-op diff and is worth 8px a line.
- **Trigger:** any component built from a Figma text style whose line-height is `normal`.

### S4 — topbar is 65px tall against Figma's 64, on every AppShell route
- `Topbar.tsx:35-36` puts `border-b` on the `<header>` *outside* an inner `div.h-16`, so the total
  is 64 + 1. The Figma Topbar instance (`475:21223`) is **64 total**.
- 1px, but it is on ~20 routes and it shifts every page's content down by a pixel against its frame.
- **Founder call (2026-07-28): this rides with the 375px topbar-overflow fix**, since both are the
  same component and re-measuring the topbar twice is waste. See the logged-in overflow item above.
- **Trigger:** the shared-shell PR that fixes the 375 overflow.

### P5 / P6 — the shipped type ramp's line-heights differ from Figma's
- Measured on G4: **H1 40 vs Figma 38**, **H3 28 vs Figma 26**. Both are the shipped `--text-*`
  tokens, so this is platform-wide, not a page defect — every H1 and H3 in the app is 2px taller
  than its frame.
- This is the already-documented "typography token gap": `scripts/tokens/build.mjs` deliberately
  does **not** emit typography (its header says so), because the Figma ramp is incomplete and the
  shipped weights/line-heights diverge. So the fix is not a one-line token edit — it needs the ramp
  reconciled in Figma first, then emitted, then a re-baseline of every VRT story.
- **Trigger:** the typography reconciliation PR. Do not patch per-page.

## G8 — Commandes reçues (`feat/g8-commandes-recues`, 2026-07-28)

### The delivery documents are their own PR, gated on schema
- **What:** `bordereau de ramassage` (Figma `510:27851`) is a multi-order A4 pickup manifest;
  `bon de livraison` (`504:27094`) is its per-order sibling, produced from G9. Both are print
  documents (595×842 = A4 @72dpi, frames named « aperçu impression »).
- **Three of the six money/identity columns cannot be filled today:** `LIVRAISON` (no
  `delivery_fee` — the same gap that blocks G4's Bénéfice net), `TRANSPORTEUR` (no carrier column
  on `orders`; `shops.preferred_carriers` is a shop-level preference, not a per-slip choice), and
  `Réf. RAM-…` (no slip table or reference column). `TOTAL À ENCAISSER (COD)` follows from
  `delivery_fee`.
- **Approved production method (founder, 2026-07-28):** a dedicated route with `@media print` +
  `window.print()`. **No PDF dependency.** Revisit `pdf-lib`/puppeteer only if a bordereau must be
  emailed or archived — which is the same question as whether it is persisted, and that question
  is what decides whether `Réf.` needs a table.
- **Trigger:** after the schema PR (`delivery_fee` + carrier + slip reference).

### Multi-select on G8 is deferred with the documents
- The main frame (`489:25313`) bakes in a checkbox column and a "Tout sélectionner" header
  (`508:27221`), and the `sélection prêtes + bordereau` specimen (`508:27230`) adds a `bulkBar`.
  All of it exists to feed the bordereau.
- **Not built (founder call):** with the documents deferred, multi-select has no destination, and
  building it now would mean defining partial-failure semantics for a bulk transition nothing
  consumes. G8 ships the `filtre` specimen's layout (`490:25690`) — the same list without the
  checkbox column.
- **Trigger:** with the documents PR.

### Migrate the three buyer-side client writes onto `cancelOrderAction` / `advanceOrderAction`
- `mes-commandes/_components/OrdersList.tsx:279`, `components/ReceiptConfirmButton.tsx:33` (both →
  `received`) and `components/CancelOrderModal.tsx:81` (cancel) still write with a direct browser
  `supabase.update()`.
- `cancelOrderAction` was written **role-aware from the start** for exactly this: it derives
  `cancelled_by` from which side of the order the caller is on, so the buyer path needs no new
  action — only the call site changes. `components/CancelOrderModal.tsx` has **zero importers**
  today and can likely be deleted outright once E3's detail page adopts the new button.
- **Trigger:** the next E3/buyer-orders PR.

### `orders` has no per-step timestamps — wait time is `pending`-only
- The row's `waitTime` slot (Figma prop on `OrderActionRow` `488:24951`) wants "waiting since" per
  state, but `orders` carries only `created_at`, `updated_at`, `received_at`, `cancelled_at`.
  `updated_at` is the last touch of *anything* on the row, so deriving a per-state wait from it
  would print a confidently wrong number.
- **Shipped (founder call):** wait shows on `pending` only, computed from `created_at`; every
  other state shows nothing.
- **Fix:** add `accepted_at` / `prepared_at` / `dispatched_at` / `in_delivery_at` / `arrived_at`,
  or a normalised `order_status_events` table (which would also give G9 a real timeline — it
  currently has no source for one). **Trigger:** the schema PR.

### 🔴 Page `<title>` is hardcoded French on every route
- Found while AR-checking G8: the Arabic page serves `<title>Commandes reçues — Servyou</title>`.
  Not a G8 defect — **every** page does this (`export const metadata = { title: '…' }`, e.g.
  `mes-favoris/page.tsx:10`), so the leak is platform-wide and G8 deliberately did not diverge
  from the pattern on one page.
- **Fix:** replace the static `metadata` export with `generateMetadata()` reading `getLang()`, and
  add the titles to both dictionaries. ~20 routes, mechanical.
- **Trigger:** an i18n pass; worth doing in one sweep rather than per page.

### G9 needs a seller-scoped counterpart to `getOrderDetail`
- `lib/marche/order-detail.ts` re-checks `buyer_id === currentUserId` — it is the buyer's view and
  returns null for a seller. G9 needs the same shape scoped on `seller_id` (or the existing one
  taught a role). `parseDeliveryAddress()` and `parseServiceBuyerNote()` in that file are already
  role-neutral and reusable as-is. **Trigger:** the G9 PR (next).

### 🔴 GATE-DESIGN PRINCIPLE: a check that can pass without the feature running is not a gate
- **Three defects in one session all had the same shape** — a verification that stopped short of
  the observable behaviour, and passed:
  1. **`tsc` passed on a server→client boundary violation.** `SortSelect` took a
     `buildHref(value)` callback prop from a Server Component. Types were perfectly valid; a
     function cannot cross the RSC boundary, so the route returned **HTTP 500** at request time.
     Typecheck cannot see runtime serialization.
  2. **Grepping the RSC flight payload instead of loading the page.** `curl | grep` found the
     expected strings in the streamed payload and read as a pass — while the page itself was
     500ing. The flight stream contains content that never renders.
  3. **Measuring a dropdown trigger without opening the panel.** The G8 sort trigger measured
     correct against Figma and was signed off; the panel was a native OS list with **no
     `[role=menu]` in the DOM at all**. A closed dropdown always looks fine.
- **The principle:** if a check can pass while the feature is broken or absent, it is not a gate —
  it is a formality. Ask of every check: *what would have to be true for this to pass while the
  thing is still broken?* If there is an easy answer, the check is aimed at the wrong layer.
- **Concretely, for this codebase:**
  - `tsc` + `build` green is **not** evidence a route renders. Load it and assert the status code.
  - Grepping served bytes is **not** evidence of a render. Check the HTTP status first, and prefer
    a DOM read over a payload grep — the earlier `scrollbar-gutter` and G8 pill findings were only
    trustworthy because they were computed geometry, not string matches.
  - Measuring a control in its default state is **not** evidence about its other states. Open the
    panel, expand the row, seed the missing status. Three separate findings this session
    (`prepared` rendering no pill, the 56px topbar overflow appearing only when logged in, the
    sidebar scroller appearing only below ~616px) were invisible in the default state.
  - A **negative control** is the cheapest way to test the check itself: break the thing on
    purpose and confirm the check fails. Two of this session's controls were themselves broken —
    one injected a `2000px` div that flexbox shrank, one toggled `scrollbar-gutter` in the state
    where both values behave identically — and each returned a **false pass**.
- **Trigger:** when adding any gate, CI step, or "verified" claim to a PR report.

## G9 — Détail de la commande (`feat/g9-order-detail`, 2026-07-28)

### Two G9 panels are omitted until the schema PR — deliberately blank, not placeheld
- **`panel-suivi` (497:26411)** — "Société de livraison" + a tracking-number **Input**. No carrier
  column, no tracking column, so the field would be a dead input.
- **`panel-historique` (504:27042)** — a timeline of EVENTS ("Confirmée sur WhatsApp", "Bon de
  livraison imprimé"). None is derivable: `orders` has no per-step timestamps and nothing records a
  WhatsApp confirmation or a print.
- **Founder call:** omit both entirely rather than render deferred placeholders. *An empty "Suivi"
  panel with a dead input teaches a seller the feature is broken; absence teaches nothing false.*
  **Exception shipped:** the cancellation entry IS rendered — `cancelled_by`,
  `cancellation_reason` and `cancelled_at` all exist, and one real entry beats a panel of nothing.
- Same reasoning drops the price breakdown's **Livraison** and **Total** rows: no `delivery_fee`,
  and a total silently equal to the subtotal is a wrong number on a COD invoice.
- **Trigger:** the schema PR (`delivery_fee` · carrier · tracking · print stamp · `order_events`),
  which is the same one the delivery documents wait on.

### WhatsApp prefill is capped to the ARABIC budget, and the cap is tested
- `WHATSAPP_MESSAGE_MAX = 300` characters, asserted in `src/__tests__/whatsapp-prefill.test.ts`
  against the shipped FR **and** AR templates with deliberately long values.
- **Why 300 and not 2000:** percent-encoding is per UTF-8 byte. A Latin letter costs 1 URL char;
  `é` and every Arabic character cost 6. Measured: 125 French chars → 187 encoded (×1.5); 100
  Arabic chars → 412 (×4.1). wa.me publishes no text limit, so the ceiling is the URL, and ~2000
  is the safe cross-browser figure — which is ~300 Arabic characters, not 2000.
- **A template written to the French budget overflows only in Arabic**, which is precisely the
  defect that ships. Any new prefill template must be added to that test.
- Latin tokens sit inside « » at the END of the Arabic string so the order reference never lands
  mid-RTL — the pattern E3's existing message already uses. Also asserted.
- `orders.whatsapp_order_message` (dead, zero importers) was **deleted** rather than left.

### The WhatsApp button contacts; it does not advance the order
- G8 first shipped `pending`'s wa/brand button as a **skin on the accept transition**. G9's frame
  settles it: the `pending` specimen puts a WhatsApp Button under "Prochaine étape" with the
  helper *"Confirmez la commande avec le client sur WhatsApp **avant** de préparer le colis"*.
- **On COD you confirm before you accept**, and conflating them means a seller accepts an order
  they have never discussed. Both surfaces now render two controls: WhatsApp (contact) and a
  separate "Accepter" (transition). G8's row was corrected in the same PR.
- Row width was measured before the change: the pending cluster was 490 of 1121; a third control
  adds ~104, landing at ~594 with mid at ~480. It fits, but 53% of the row becomes controls, so
  the row uses the SHORT label ("WhatsApp") while G9's rail button carries the full sentence.

## delivery_fee (`discovery/delivery-fee`, 2026-08-01)

Both entries surfaced during Phase-1 discovery for `delivery_fee_tnd`. Neither is caused by that
work and neither is fixed in it — logged per "one PR, one focus".

### 🔴 The BUYER's order detail reads the LIVE product price, not the snapshot

- `src/lib/marche/order-detail.ts` — the data layer behind `/mes-commandes/[id]` — selects
  `products ( id, title, price_tnd, shop_id, categories )` and **never reads `unit_price_tnd` or
  `item_title`**. Verified by grep: both column names are absent from the file.
- **So a buyer's past order already drifts.** Seller edits the price of a product from 80 → 120
  TND, and every historical order that buyer placed silently re-renders at 120. The order was
  never for 120. `set_order_snapshot` froze the correct value at insert; this surface just doesn't
  read it.
- The seller side does it right — `src/lib/marche/seller-orders.ts:230` reads
  `r.item_title ?? one(r.products)?.title ?? …`, snapshot first with the join as fallback. The
  asymmetry is the bug: the same order shows different money to the two parties once a price moves.
- **Why it matters for `delivery_fee_tnd`:** the fee is frozen onto `orders` by the same trigger
  for the same reason. Wiring the buyer's total off the `products` join would inherit this exact
  drift the moment a seller raises their rate — and on a COD invoice a wrong total is a wrong
  instruction to a carrier, not just a cosmetic slip.
- **Fix shape:** select `unit_price_tnd, item_title` (and later `delivery_fee_tnd`) in
  `order-detail.ts` and prefer them over the join, mirroring `seller-orders.ts`. Keep the join as
  fallback for the 10 pre-snapshot orders whose `unit_price_tnd` is NULL — `netProfitOf`'s
  null-gate reasoning at `seller-dashboard.ts:53` applies verbatim: a missing snapshot must not
  render as a confident 0.
- **Trigger:** whenever `/mes-commandes/[id]` is next touched, and necessarily BEFORE any buyer
  surface renders a delivery-fee total.

### The governorate is text inside `delivery_address` — a Phase 2 zone table cannot join on it

- `src/app/demander/[id]/actions.ts:92` writes
  `delivery_address: \`${address}, ${gov}\`  // governorate folded in (no dedicated column)`, and
  `order-detail.ts` splits it back out on the LAST `", "` against a `Set` of known values.
- It round-trips today, but it is a string, not a key. **Per-governorate delivery rates (Phase 2)
  need `orders.delivery_governorate` as a real column first** — a rate table cannot join a
  suffix-parsed address, and the parse is lossy the moment a street name itself ends in something
  that matches a governorate.
- The vocabulary is already there and typed: `GOVERNORATES` in `src/lib/tunisia-governorates.ts`
  (`value` / `fr` / `ar`), consumed at 5 call sites. Only the column is missing.
- **This does not block `products.delivery_fee_tnd`.** A flat per-product fee layers under a zone
  table cleanly: the table overrides at quote time, and the frozen `orders.delivery_fee_tnd`
  remains the record of what was actually charged. The point of logging it is that the zone work
  is not "just add a table" — it carries a schema change and a backfill of existing orders.
- **Trigger:** the per-governorate rate-table PR.

### 🔴 The AppShell topbar overflows the viewport at 375px — every shell page, not one

- **Measured on the G6 gate pass (2026-08-06).** At a 375×812 viewport, `document.scrollWidth` is
  **431px against a 375px viewport — 56px of horizontal overflow.** The outermost offender is the
  topbar's right-hand cluster, `div.flex.shrink-0.items-center.gap-4`, holding the Radix user-menu
  button and the 40px avatar.
- **It is the SHELL, not any one page.** The same 431px and the same offending element were
  measured on `/commandes-recues`, `/tableau-de-bord-vendeur`, `/mes-missions/nouvelle` and
  `/mes-produits/ajouter`. No page-level element appears in the offender list on any of them.
- ⚑ **This is why the earlier frontend audit recorded "380px 0-overflow".** That pass measured at
  **380px**, where it happens to fit. The defect sits between 375 and 380 — and 375 is the iPhone
  SE / iPhone mini width, i.e. the narrowest real device, on a platform that is 70%+ mobile.
- **Not fixed in the G6 PR.** The topbar is shared by 19+ routes; changing it is a shell PR with its
  own visual gate, not a line in a form PR.
- **Reproduce:**
  `node scripts/gate/authed.mjs --email <shop-owner> --route /tableau-de-bord-vendeur --width 375 --height 812 --eval <overflow-probe> --json`
- **Trigger:** the next shell/topbar PR, or any mobile-polish pass. Gate at **375**, not 380.
- **✅ RESOLVED — `fix/appshell-topbar-and-pitch-pages`, 2026-08-13.** `Topbar.tsx` below `sm` now
  renders the icon-only S-mark instead of the full wordmark (saves ~79px) and the icon cluster's
  gap tightens from 16px to 8px below `md` (saves 16px); both revert to the original at their
  breakpoint. Re-measured with the same `authed.mjs` command as above, plus `/marche/produits`,
  `/produits/[id]`, `/ma-boutique/creer`, and the two newly AppShell-migrated
  `/devenir-vendeur/{boutique,freelance}`: `scrollWidth == clientWidth` on all of them, FR and AR,
  at 375. Full writeup on the G4 entry above (same fix, not repeated here). S4 (the 65px-vs-64px
  height delta on the same component) remains open — out of this PR's stated scope.

## G6 image rendering (`fix/g6-figma-fidelity`, 2026-08-06)

### 🔴 `next/image` 400s on EVERY Supabase URL in local dev — NAT64, not `remotePatterns`

- **The symptom is a blank image, and the error message lies about the cause.** Any `<Image>` whose
  `src` is an `xggomcitqrkaylqezjjz.supabase.co` URL requests `/_next/image?url=<supabase>`, which
  returns **400**. The `<img>` ends up `complete: true` with `naturalWidth: 0` — a blank tile, no
  console error at the component. Diagnosed on the G6 upload grid (`ImageUploadGrid`), where three
  freshly uploaded thumbnails rendered blank.
- ⚑ **It is NOT the `remotePatterns` allowlist, although the 400 reports the identical message.**
  Do not re-audit `next.config.ts`. `remotePatterns` is correct and applied — verified three ways:
  the *resolved* build config contains the entry verbatim, Next's own `matchRemotePattern` returns
  `true` for this exact pattern + URL, and the `deviceSizes`/`qualities` trimming demonstrably bites
  on a local image that optimizes fine. All three passed while the 400 persisted.
- **The actual thrower is `fetchExternalImage` (`image-optimizer.js:916`) — Next 16's SSRF guard.**
  `xggomcitqrkaylqezjjz.supabase.co` resolves to two **NAT64** addresses (`64:ff9b::/96`) alongside
  its two public Cloudflare IPs, and the guard aborts if **any** resolved address is private. The
  dev server logs it verbatim: `resolved to private ip [64:ff9b::…]`.
- 🟡 **Scope — read this before acting on it.** NAT64 is a property of **this machine's DNS64
  resolver**, not of the app, the bucket or the URL. So: **it reproduces in local dev, and
  production behaviour is UNVERIFIED.** Vercel's resolver may return only the public A/AAAA records,
  in which case prod is unaffected. Nobody has checked. Do not assert either way — and in
  particular, do not "fix" prod for a defect that may only exist on one laptop.
- **Only ONE surface is immune, and only by side-stepping the optimizer entirely.** `ImageUploadGrid`
  now renders the `blob:` URL the browser already holds (commit `d7a94be`) — 96px thumbs of a local
  file, so the round trip was the wrong shape regardless. That fix does **not** generalise: every
  surface below renders an image the browser has never seen.
- **Surfaces still on the unfixed path** (all render remote Supabase URLs through `next/image`):
  - `/produits/[id]` — **D1's gallery**, images from `src/lib/marche/product-detail.ts`
  - `ProductListingCard` — via `ListingResults` (marketplace browse + **`/recherche` results**,
    fed by `src/lib/search/search-marketplace.ts`) and `ConsumerHomepage`
  - `ui/avatar.tsx` — **inferred, not observed.** Its `src` is a remote URL on the *same* Supabase
    hostname, so it resolves the same way and meets the same guard. Listed because the guard keys on
    the host, not the bucket; nobody has watched an avatar go blank.
- ✅ **CONFIRMED on `ProductListingCard`, 2026-08-07 — the prediction above was right.** The first
  real seller-created product (`Baskets Nike Air Force 1 Low en cuir`, `8eff9603-4cb1-4050-ae0e-96fe50f297e0`)
  went through G6 with five images; its cover (`display_order = 0`) then failed to optimize on `/`,
  twice, on a clean `.next` at `2b65288`. Verbatim, both occurrences identical but for resolver
  ordering:
  ```
  ⨯ upstream image https://xggomcitqrkaylqezjjz.supabase.co/storage/v1/object/public/
    product-images/f4757d2d-705c-48c8-bd58-37a35c7bdab3/8eff9603-4cb1-4050-ae0e-96fe50f297e0/
    0c0c541e-a750-4a29-81cb-995e5b7d3578.webp
    resolved to private ip ["64:ff9b::6812:260a","64:ff9b::ac40:95f6"]
  ```
  Note what this does **not** change: the DB row and the storage object are both intact and correct
  (5 `product_images` rows, 5 objects under one `shopId/productId/` prefix). The defect is the
  optimizer round-trip alone. And note what it still does **not** establish — this is the same
  laptop's DNS64 resolver as before, so **production remains UNVERIFIED**; the second resolver
  ordering across two otherwise identical requests is DNS round-robin, not new evidence about prod.
  Carried forward untouched: do not "fix" prod for it, and do not re-audit `remotePatterns`.
- **If you hit a blank image, this is the first thing to check** — before the bucket, before the
  policies, before the URL. Confirm with the dev-server log line above, or by opening the
  `/_next/image?url=…` URL directly (400) next to the raw Supabase URL (200).
- **Escape hatches, if it turns out to need fixing:** `unoptimized` on the specific `<Image>`
  (currently used **nowhere** in `src`), or a plain `<img>` — both trade away the optimizer, which
  is why neither was applied blind here.
- **Trigger:** whenever a blank image is reported on any surface above, **or** before the next PR
  that ships a new remote-image surface. First step is cheap and unblocks the rest: check whether a
  deployed preview reproduces it, which converts "UNVERIFIED" into a real scope.

### 🟡 The G6 cover ribbon is measured in FR only — AR/RTL is UNTESTED, not passing

- The cover ribbon on the first upload tile (`ImageUploadGrid.tsx`) was moved to the bottom of the
  tile and verified by hit-test at **1440, FR only**: `elementFromPoint` at the text tail returns the
  ribbon, the remove button stays hittable, `scrollWidth == clientWidth` (no clipping).
- **AR was not measured, and is not claimed either way.** `scripts/gate/authed.mjs` cannot set the
  language cookie — its own follow-up, logged above at "🟡 `scripts/gate/authed.mjs` cannot set the
  language cookie" — so the AR half of every gate on this surface is unreachable through it.
- What is *reasoned* but **unverified**: the ribbon is `inset-x-0 bottom-0` (symmetric, so mirroring
  cannot move it) and the remove button is `end-2 top-2` (mirrors to the start side). They now sit on
  different rows of the tile — ribbon 74.5→95, button 9→37 of 96 — so the occlusion that motivated
  the move should be absent in both directions. `الغلاف` measures 23.55px against an 82px content
  box, so clipping is implausible. **None of that is a measurement.**
- **Trigger:** whenever the gate learns to set the language cookie, or the next manual AR pass over
  the seller surfaces — whichever comes first. Measure, then delete this entry or convert it to a
  defect.

### 🔴 A poisoned `.next` presents as a PLAUSIBLE APPLICATION BUG — the tell is the line number

- **The protocol is already written** ("Build clobbers dev `.next`" — stop dev, or build elsewhere,
  and `rm -rf .next` after). **This entry is not the rule. It is the SYMPTOM**, because the rule did
  not help: nothing looked like a build problem.
- **What happened (2026-08-07).** `npm run build` ran with dev stopped — correct — and then
  `next dev` was started on top of the production `.next` that build had just written. Dev served a
  **stale client bundle against a fresh server**. Image uploads began failing with
  *"Une erreur est survenue. Veuillez réessayer."*, two tiles in the error state, `Publier` correctly
  disabled. Nothing reached storage. It read exactly like a regression in the PR that had just
  merged.
- ⚑ **THE DIAGNOSTIC — the line number belonged to NEW code while the behaviour belonged to OLD.**
  The dev log carried a real React error with a real source frame:
  ```
  Cannot update a component (`ProductForm`) while rendering a different component (`ImageUploadGrid`)
      at src/components/produits/ImageUploadGrid.tsx:149:10
    > 149 |       fd.append('image', file)
  ```
  `fd.append` **is not a setState call**, and the error it was reporting had been *fixed and merged*
  hours earlier. That mismatch — a current line number under a stale behaviour — is the signature.
  A stale bundle throws the OLD error and Next maps it onto the CURRENT file, so the frame looks
  authoritative and points at innocent code.
- **How it fooled the first read.** The failure had a plausible in-app story: the same PR had renamed
  a prop (`productId` → `initialProductId`), so a stale chunk reading the old name yields `undefined`
  → `fd.append('productId', undefined)` → the literal string `"undefined"` → the uuid parse fails →
  the generic error. Every symptom fits a real code path. **The application explanation was
  coherent, and still wrong.**
- **The check, in order.** Before debugging any post-build dev failure: (1) does a logged error's
  source frame point at a line that could not raise it? (2) does the error correspond to something
  already fixed? If either is yes — **`rm -rf .next` and restart before reading another line of
  application code.** Here that alone resolved it: uploads succeeded, and the React warning count
  went from 1 to **0** in the clean run.
- **Cost of not checking:** the failure was reported as a live defect, and the diagnosis started at
  the server action, which was blameless.
- **Trigger:** any unexplained dev failure whose first appearance follows a `npm run build`.

## C1 — Marketplace produits (`feat/c1-marketplace-produits`, 2026-08-07)

### ✅ RESOLVED 2026-08-12 — `tableau-de-bord-vendeur:83` — "Voir ma boutique" is a live 404 a seller can press today

- **This is a defect NOW, not a consequence of the Boutiques deferral below.** It is filed
  separately on purpose: deferring a marketplace lens is a scope decision, but a button on the
  seller's own dashboard that leads nowhere is broken behaviour that predates this PR and outlives
  the deferral.
- `src/app/tableau-de-bord-vendeur/page.tsx:83` renders an action-rail item:
  ```ts
  { key: 'viewPublic', href: shop ? `/boutique/${shop.id}` : '/devenir-vendeur', icon: Eye }
  ```
  Any shop owner who has completed G2 gets the `/boutique/{id}` branch. **There is no `/boutique`
  route anywhere under `src/app`** — not a `ComingSoon` stub, no directory at all. Verified against
  a running dev server on a clean `.next`:
  ```
  GET http://localhost:3000/boutique/f4757d2d-705c-48c8-bd58-37a35c7bdab3  →  404 Not Found
  ```
  Nothing rescues it: no catch-all segment exists under `src/app`, and `next.config.ts`
  `redirects()` covers only the four legacy auth routes (`/login`, `/signup`, `/forgot-password`,
  `/update-password`).
- **Two more callers, same 404**, both admin-only so lower blast radius:
  `src/app/admin/utilisateurs/[id]/page.tsx:137` (opens in a new tab) and
  `src/app/admin/signalements/[id]/page.tsx:53` (`shop: '/boutique'` base).
- ⚑ **Not fixed in C1, and that is a scope call rather than an oversight.** The honest fix is
  building D3 (`540:32918`), which is a page rebuild. The dishonest fix — pointing the button at a
  new stub — trades a 404 for a dead end, which is the thing C1 exists to stop doing.
- **Closed by `fix/d3` (2026-08-12).** `/boutique/[id]` now exists (`src/app/boutique/[id]/page.tsx`).
  No code change was needed at this call site or the two admin ones below — all three already
  built the correct `/boutique/{id}` href, they just had nowhere to land. Verified live: signed-in
  shop owner, G4 quick action → real shop page, not a 404 (see this PR's own verification record).

### ✅ RESOLVED 2026-08-12 (was: 🔴 4th entry) `/ma-boutique/creer/succes:83` — G2 success

- **"Voir ma boutique publique" ships as a `disabled` `Button`, not a `Link` to `/boutique/{id}`.**
  Founder ruling, checked against this same entry's first three surfaces before building: D1
  (`ProductDetail.tsx`, two "Voir la boutique" spans) and C1 (`ProduitsLensToggle.tsx`, disabled
  "Boutiques" segment) already treat D3 as absent; only the G4 quick action above links live, and
  that link is this entry's own 🔴, not a pattern to extend. The succes screen matches D1/C1, the
  majority and the deliberate treatment — logged here as the 4th surface against the same root
  cause, not a new bug.
- **Correction to a stale in-code comment surfaced while auditing this:** `ProductDetail.tsx:35`
  claims "same treatment as `ServiceDetail.tsx:232`" — checked, and that line is D2's report-line
  today, not a shop link. D2 (service detail) is freelancer-owned and has no shop/D3 concept at all,
  so it was never a real surface in this count. Not fixed (a comment, not a defect), logged so it
  isn't re-cited as a fourth precedent by a future pass.
- **Closed by `fix/d3` (2026-08-12).** All four surfaces now link to `/boutique/[id]` (D1's two
  spans, the G2-success button) or stay deliberately disabled with a corrected reason (C1's
  Boutiques toggle — re-ruled to stay off, see "Boutiques lens" entry below, not simply unblocked).

### ✅ D3 URL shape — RESOLVED 2026-08-12: bare `[id]`, not `[slug]`

- **Ruled by the founder while this entry was still open** — recorded here now because the ruling
  predates this doc entry and was never written down, which is why a later pass (G2 success) read
  it as still pending. Decided **once**, per this entry's own original request, and it does cover
  all four public-profile-shaped routes, not only D3: **D1, D2, D3, D4 all use a bare id.** `shops`
  and `freelancer_profiles` both remain without a `slug` column — this was not a per-route choice
  that happened to converge, it is one decision applied uniformly.
  - **`[id]`** — the shape every live link already builds (`/boutique/${shop.id}`, this entry's
    first 🔴) and the shape D1 shipped its own route on (`/produits/[id]`). Zero migration, ships D3
    immediately when it's built.
  - **`[slug]`** was the alternative on the table (nullable `slug`, unique index, backfill,
    collision strategy) — not pursued. No `slug` column exists on `shops` or `freelancer_profiles`
    today, and none is planned against this ruling.
- **Nothing left to decide when D3 (or D4) is built.** D1 (`/produits/[id]`) and D2
  (`/services/[id]`) are already shipped on bare id. D3 is not yet built; when it is, the route is
  `/boutique/[id]`. D4 is not yet built either (`src/app/freelance*` does not exist under `src/app`
  today) — its route is `/freelance/[id]` under this ruling, **correcting** the `/freelance/[slug]`
  naming carried in the design registry and memory notes, which reflects the Figma frame's own
  node name, not a coded decision. One shape across all four public-profile-style routes, decided
  once rather than re-opened per page.

### Boutiques lens — DEFERRED with a "Bientôt" badge, and why the Freelances precedent did not decide it

- **The frame is real and buildable.** `C1 — vue Boutiques = 578:42528` (browseHead `578:42529`,
  gridWrap `578:42532`), and the card exists as a component **in Figma only**:
  **`Shop Card = 578:42367` — 4 variants · `state[default,hover]` `banner[true,false]` ·
  props: `shopName(text) city(text) productCount(text)`.** All three props map to real columns
  (`shops.name`, `shops.city`, and a count over `products`). This is NOT deferred for missing data.
- ⚑ **RE-RULED 2026-08-12, after D3 shipped — stays disabled.** The original reasoning below ("the
  card has nowhere to link") is now stale and superseded: D3 (`/boutique/[id]`) shipped and the
  destination exists. The toggle was re-examined anyway and the founder ruled it **stays
  disabled**, because the actual blocker was always bigger than the destination: **`ShopCard`
  exists nowhere in code** (`578:42367` is Figma-only, confirmed by a full `src/` grep — zero
  matches) and neither does a shop-grid render path for `/marche/produits`. Flipping the toggle
  needs a new component, a new query, and wiring — a separate build, not something D3 unlocks for
  free. `ProduitsLensToggle.tsx`'s own comment now states this correctly.
  - *(Original reasoning, kept for history: "It is deferred because the card has nowhere to
    link. Every Shop Card CTA resolves to `/boutique/{id}`, which 404s. A grid of shops linking
    into hard 404s is worse than a disabled toggle." — true at the time, incomplete: it named the
    destination as the only blocker when the code path was equally missing.)*
- **The Freelances precedent (`ServicesLensToggle`) was checked and does NOT transfer.** Freelances
  was deferred because its data layer, its cards, and the `/freelance` pages all did not exist.
  Here the data exists (`shops`, `products`) and the destination now exists (D3); only the
  component + grid code is missing. Same outcome, different reason — do not cite "we deferred
  Freelances too" as the justification when revisiting.
- **What ships instead:** the `Produits` segment active, `Boutiques` rendered `disabled` +
  `aria-disabled` with a visible "Bientôt" badge. That is a **deliberate divergence from
  `578:42513`, which draws both segments enabled** — marked in-code so a later fidelity pass can
  tell it from drift.
- **Data reality at deferral time** (1 shop total): 1 visible, 1 with active products, 1 with a
  city, **0 with a logo**. So the lens would have rendered a one-card grid, and the Shop Card's
  logo slot has no data on any row — it would fall back to initials, as the Product Card's shop
  badge already does.
- **Trigger:** build `ShopCard` (from `578:42367`) + a shop-grid query + wire the toggle, as its
  own PR. D3 landing does not trigger this by itself — that assumption is what this re-ruling
  corrected.

### The C1 product card is a FORK, not a restyle — the delta table, so the consolidation is not re-measured

- **Decision (founder, explicit): fork route-local, leave `ProductListingCard` alone.**
  `ProductListingCard` reaches `/recherche`, `/categories/[slug]` and `ConsumerHomepage` through
  `ListingResults`. Those three work today. Rewriting the shared card to match a frame drawn for a
  fourth surface breaks three pages to fix one.
- **Measured `569:39818` (272×373) against the shipped `ProductListingCard`.** The geometry closes
  exactly: cover 276 + body (12 + 22 title + 10 gap + 41 bottom-row + 12) = 373.

  | | Figma `569:39818` | `ProductListingCard` |
  |---|---|---|
  | Cover | **276 px fixed**, `surface/sunken`, `border-b subtle` | `aspect-square` (272 at this width) |
  | Heart | top-**start** 8, 32 px, white + 1px subtle, radius 16 | top-**end** 12, 36 px, `white/90` + backdrop-blur |
  | Shop badge | **32 px initials chip, top-end**, `blue/800` 12 semibold | ✗ absent |
  | Category chip | **on the cover, bottom-start**, sunken, body-sm 14 medium | ✗ absent |
  | Title | 16 semibold, leading 22, single-line ellipsis | 16 semibold, `line-clamp-1` |
  | Description | ✗ **none** | 2-line, `min-h-[40px]` |
  | Meta | city + `icon-map-pin` 14, 12 px medium, `text/muted` | `"shop · city"` text, 12 px, no icon |
  | Price | 17 px semibold, leading 22 | `text-body` bold |
  | CTA | 40 px, **`blue/600`**, radius 8, `icon-shopping-bag` 20 | 36 px, **black**, full-round, arrow-up-right |
  | Container | 1px `border/subtle`, radius 12, no shadow | `card-premium` (drop shadow) |

- **The grid CLASSES were validated against the frame and copied; `ListingResults` itself is NOT
  consumed.** Its product branch is already `grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`, and
  the Figma grid is 4-up with gap 16 on both axes (x 0/288/576/864, y 0/389/778 at 272×373) — so the
  responsive ramp needed no rethinking. But `ListingResults` hard-renders `ProductListingCard`, and
  that card is forked here, so C1 carries its own one-purpose grid wrapper with the same classes.
  The value of the check was the opposite of reuse: it proved C1 needs **no change to a 7-consumer
  component**, so that blast radius was never taken. Do not "DRY this up" by adding a variant to
  `ListingResults` — that re-opens precisely the risk the fork was chosen to avoid.
- **Trigger for consolidation:** whichever comes first — `/recherche` or `/categories/[slug]` being
  rebuilt to a Figma frame, or a third product-card variant appearing. At that point the table above
  IS the diff; do not re-measure.

### The two marketplace filter bars are forks of each other — deltas, for the same reason

- `ProduitsFilterBar` is forked from `ServicesFilterBar` (331 lines) per the skill's
  "route-local until the third consumer" rule. They are ~90% identical: search → `q`, single-select
  Catégorie, single-select Ville, Prix min/max popover, sort dropdown, dismissible chips, all
  writing to the URL via `buildSearchQuery` → `router.push`.
- **Real measured deltas, not preference:**

  | | Services (`611:45644`) | Produits (`570:40225`) |
  |---|---|---|
  | Search field height | 40 (`h-10`) | **44** |
  | Select height | 40 | 40 |
  | Lens toggle icons | Briefcase / Users | **none — text only** |
  | Search placeholder | "Rechercher un service…" | "Rechercher un produit…" |
  | i18n namespace | `services.filters.*` / `services.sort.*` | `produits.filters.*` / `produits.sort.*` |

- ⚑ **The Figma's empty label + helperRow slots are NOT reproduced.** `570:40225`'s search block
  measures 97 tall as 21 (empty label) + 8 + 44 (field) + 8 + 16 (empty helper) — those are
  artifacts of the shared `Input` component instance rendering with no label and no helper text,
  not design intent. The build renders the 44 px field alone, with the 40 px selects vertically
  centred against it, which is what the frame looks like.
- **Trigger for consolidation:** a third browse surface, or the Boutiques lens landing (which needs
  a third variant of the same bar). Fold both into one `MarketplaceFilterBar` taking a namespace +
  a control list; do not re-derive the deltas.

### 🟡 In Arabic, filter chips say `د.ت` and the cards beside them say `TND` — platform-wide

- **Pre-existing, NOT introduced by C1, and reproduced by C1 on purpose.** Found while verifying
  the AR render of `/marche/produits`; logged rather than fixed because fixing it correctly is a
  cross-surface change and this PR is one page.
- The two halves disagree:
  - `tndPrice()` (`components/listings/listing-utils.ts`) returns a literal `"{n} TND"` in **both**
    locales, by an explicit decision in its own docstring: *"currency code, not translatable copy."*
    It feeds every listing card on every surface.
  - `services.filters.currency` / `produits.filters.currency` resolve to `"TND"` in FR and
    **`"د.ت"` in AR**, and feed the price filter chip.
- So an Arabic buyer filtering by price sees a chip reading `≥ 100 د.ت` sitting directly above cards
  reading `100 TND`. Verified in the served AR HTML: 9 cards rendered `>10 TND<` etc. under
  `dir="rtl"`.
- ⚑ **C1 deliberately matched the services behaviour instead of correcting it locally.** A one-page
  fix would have made `/marche/produits` disagree with `/marche/services`, `/recherche`,
  `/categories/[slug]` and the consumer homepage — trading a consistent platform-wide inconsistency
  for an inconsistent one, which is harder to find and harder to fix later.
- **The decision when this is picked up** is which half is right, and it is a founder call, not a
  mechanical one: either `tndPrice` becomes locale-aware (touches every listing surface, and the
  digits must stay LTR inside RTL text), or the AR currency keys become `"TND"` (cheap, one line
  each, and arguably correct since TND is an ISO code rather than copy).
- **Trigger:** the next PR that touches `tndPrice`, or the first AR-language QA pass on any listing
  surface. Do not fix it on one page.

## Purging corrupt storage objects (`chore/purge-corrupt-product-images`, 2026-08-07)

### What was purged, and why nothing could be salvaged

- **6 objects out of `product-images`, and 5 `product_images` rows**, leaving both at zero:
  - 5 objects under `f4757d2d…/8eff9603…/` — the entire gallery of the first real seller product
    ("Baskets Nike Air Force 1 Low en cuir"), 42,145 / 167,182 / 14,335 / 70,524 / 38,261 bytes,
    each with a `product_images` row at `display_order` 0-4.
  - 1 object under `f4757d2d…/8e397079…/` (74,410 B) — the deliberate orphan left by the PR #122
    verification upload, which proved the fix without publishing a product, so it never had a row.
- **Cause:** a Node `Buffer` passed to `supabase.storage.upload()` was stringified through UTF-8 by
  storage-js 2.107.0 (`dist/index.mjs:620`), turning every non-UTF-8 byte into U+FFFD. Fixed in
  PR #122 by sending a `Blob`, which takes the FormData branch (`:610`) instead.
- ⚑ **Unrecoverable, which is why this was a delete and not a repair.** U+FFFD is a *replacement*,
  not an escape — the original byte is gone, so there is no inverse transform. `sharp` reports
  `corrupt header: webp: unable to parse image`, and the damage is visible in the header: the RIFF
  length field still declares the pre-corruption size (23,310) while the file is 42,145 bytes,
  ~1.8x inflated. Do not spend time on a recovery script for this class.
- **Deliberately NOT deleted:** the `products` row itself. Only its photos went — title, `active`
  status, 10.00 TND, delivery fee, `stock_count` 10 and category Mode are untouched, and
  `updated_at` was unchanged by the operation (`14:31:46`), which is the cheap proof nothing else
  in the row moved.

### 🔴 Delete storage objects through the Storage API — NEVER `delete from storage.objects`

- A SQL delete against `storage.objects` removes **only the metadata row**. The physical file stays
  in the S3 backend: still billed, still counted against the 1 GB free tier, and now invisible to
  every listing, every sweep and every audit — because all of them enumerate through the metadata
  table that no longer mentions it.
- That is strictly worse than the corruption being cleaned up: a corrupt object you can see is a
  bug, an untracked file you cannot see is a leak with no handle to grab.
- **Use `supabase.storage.from(bucket).remove([paths])` with explicit paths**, never a prefix
  wildcard — the blast radius of a cleanup should be readable at a glance in the diff or the script.
- This applies to any future cleanup: the reconciliation sweep in
  `docs/design/image-storage-discovery.md` §6c, avatar sweeps, and shop-asset cleanup all inherit
  the same rule.

### The verification shape that made this trustworthy

Three habits, each of which caught something a naive version would have missed:

- **Check the REVERSE direction before deleting.** The brief was "objects to remove", but "zero
  dangling pointers" also depends on rows pointing at objects that do not exist. Querying
  `product_images` rows with no matching `storage.objects` entry returned 0 — so the inventory was
  complete in both directions, and the delete could not leave a half-cleaned state. A one-directional
  inventory would have looked equally green while missing that class entirely.
- ⚑ **`.remove()` FAILS OPEN — never treat its return value as proof.** It returns success with an
  empty `data` array when it deleted nothing (RLS hiding the rows is the usual reason). Its report
  said "6 deleted" here, and that was still not evidence. Verification came from three independent
  angles instead: re-querying `storage.objects` (0 rows), re-querying `product_images` (0 rows), and
  fetching the public URLs directly (400, not 200) — the last being the only one that proves the
  bytes left the backend rather than just the index.
- **Snapshot the row you intend to KEEP, before the delete.** The product row was captured up front
  precisely so "the product survived intact" could be asserted field by field afterwards instead of
  eyeballed. `updated_at` matching is what turns "it looks fine" into "nothing touched it".

### 🟡 D1 `/produits/[id]` has NO 375 frame — every responsive value on it is INFERRED

- **What:** D1 was rebuilt (feat/d1-product-detail) from `562:39013`, a **1440 frame plus four
  DESKTOP specimens** (`563:39552` galerie · `563:39579` rupture · `563:39668` partager ·
  `563:39705` signaler). There is no mobile frame anywhere on the Screens page. Every desktop
  number in the build is measured and recorded in `docs/design/d1-discovery.md §2`; **every
  responsive number is a decision, not a measurement.**
- **What was inferred** (founder-approved, following D2's pattern rather than inventing a third
  answer): single column below `lg` · gallery main from 600² to a full-width `aspect-square` ·
  thumb strip horizontally scrollable (`overflow-x-auto`, inert at `lg` where 368 < 600) ·
  related row on C1's `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- **⚑ This is the SAME gap C1 already carries** — see `docs/design/marche-produits-measurements.md`
  "Known gaps", which logs that no 375 C1 frame exists either and that its `grid-cols-1` /
  `sm:grid-cols-2` ramp is inherited verbatim from `ListingResults` with no design source. **Two
  product surfaces now share one undrawn mobile story.** The services side resolved the analogous
  question only once it had a 375 frame (`sm:gap-6` desktop / `gap-4` mobile, delta P11).
- **Trigger:** draw the 375 frames for C1 and D1 together, in one pass, and reconcile both ramps
  against them. Doing D1 alone would re-create the split it is currently avoiding.
- **Verified at 375 in a real browser regardless:** strip scrolls (368 vs 343 client), the last
  thumb is reachable and selectable after scrolling, and `documentElement.scrollWidth` is 375
  against a 375 viewport — no horizontal overflow. So the inferred layout *works*; it is just not
  *designed*.

**🟡 E1-product `/demander/[id]` (product branch) joins this same gap.** Built from `589:43997` —
one 1440 frame, no mobile specimen anywhere on the Screens page, same as D1's own measurement
(`docs/design/d1-discovery.md §6`). The stacked layout below `xl:` (order summary first in the
DOM, form second — E1-service's own `col-start`/`row-start` reorder trick, just moved to a
different breakpoint per the grid-overflow rulings) is INFERRED from the sibling that does have
one, not measured. **Three product/service-adjacent surfaces now share one undrawn mobile story**
(D1, C1, and now E1-product) — the trigger below should draw all three together, not just the
original two, or a fourth pass will split the reconciliation again.

- **Verification status:** see the PR's own verification section for the actual 375/band results —
  not restated here to avoid this doc drifting out of sync with what was really measured.

### D2's share control is inert — it links to the page it is already on

- **What:** `ServiceDetail.tsx:91-99` renders the share affordance as
  `<Link href={`/services/${service.id}`}>` carrying `aria-label={t('serviceDetail.share')}` —
  which is "Copier le lien". Clicking it navigates to the current page and copies nothing.
- **Found during:** the D1 build, while looking for a share precedent to follow. **D1 deliberately
  did NOT reproduce it** — `ShareLinkButton` writes `window.location.href` to the clipboard and
  toasts `product.detail.link_copied`, using keys that already existed in both locales.
- **Why deferred:** one PR, one focus. D1 is a product-surface PR and D2 is a different route; the
  fix is ~15 lines (swap the `<Link>` for the same client component) but it belongs in a PR that
  can gate D2's own walkthrough.
- **Trigger:** next time D2 is opened for any reason. `ShareLinkButton` is already generic enough
  to serve it — only the toast key differs, and `serviceDetail.share` would need a sibling
  `link_copied` key in fr.ts/ar.ts.

### `ProductBrowseCard` + `ProductCoverImage` are route-local but now serve two routes

- **What:** both live in `src/app/marche/produits/_components/` and are now imported from
  `src/components/produits/` by D1 — a component in the shared tree reaching **into** an app route's
  private `_components` folder. It works and it is intentional (founder ruling: import in place, do
  not move), but the direction of that dependency is backwards.
- **Why not moved now:** moving them means touching C1's imports inside a D1 PR, and C1 is the
  surface whose card geometry the whole D1 related-row measurement is calibrated against. The move
  is mechanical; the risk is that it lands in a PR whose reviewer is looking at a different page.
- **⚑ `ProductCoverImage` DID gain one additive change here:** an optional `priority` prop
  defaulting to `false`, so every existing C1 call site renders byte-identically. D1's gallery main
  image is the page's LCP element and the standards require `priority` above the fold; the
  alternative was re-inlining the placeholder at the call site, which that component's own header
  explicitly forbids.
- **Trigger:** when D3 `/boutique/[slug]` becomes the **third** consumer. At that point move both to
  `src/components/produits/` in their own PR and update all three import sites together.
- **🔴 ADDENDUM (F1-favoris PR, 2026-08-16) — the trigger already fired, and now there's a fourth.**
  `ProductBrowseCard` itself (not just `ProductCoverImage`) is imported directly from
  `@/app/marche/produits/_components/ProductBrowseCard` by THREE call sites already:
  `ProductBrowseGrid.tsx` (C1), `ProductDetail.tsx` (D1), `ShopDetail.tsx` (D3) — the "third
  consumer" trigger above was met before this PR touched anything. F1 adds a fourth
  (`src/app/mes-favoris/_components/FavorisProductGrid.tsx`, same import path, same in-place
  pattern per the existing ruling — see `docs/design/f1-discovery.md` §2). Not moved here either:
  this PR is a header fix + card swap, not the promotion PR the founder already scoped above.
  Four call sites reaching into one route's private folder is a stronger case for that promotion
  PR than three was — nothing here changes the plan, just the urgency.

### `tndPrice` is locale-blind, and `ar.ts` carries two currency notations

- **What:** `tndPrice` (`listing-utils.ts`) hardcodes Latin `" TND"` and takes no `lang`, so every
  price on every Arabic page renders `1600 TND`. Meanwhile `ar.ts` uses `د.ت` in **22** places —
  including `product.form.currency_suffix`, which is the currency adornment inside G6's own price
  field — while its header comment states the opposite rule: *"Currency code mirrors fr.ts: fr uses
  'TND', so ar keeps 'TND'."* The file contradicts its own documented convention.
- **Surfaced by:** D1's price block, which is three adjacent lines — the price through `tndPrice`,
  then a fee line and a total line through translated templates. Writing `د.ت` in the two new AR
  templates put **two notations inside one block**. D1 followed the header rule and uses `TND` in
  both, so the block is internally consistent; it did **not** resolve which notation Servyou
  actually wants.
- **Why deferred:** `tndPrice` serves `/recherche`, `/categories/[slug]`, `ConsumerHomepage`, C1 and
  now D1. Making it locale-aware is a one-line change to the function and a five-surface AR
  walkthrough — and the *product* question (does an Arabic Servyou page say `TND` or `د.ت`?) is a
  founder call, not an engineering one. Picking one inside a D1 PR would set platform-wide currency
  vocabulary from a product-detail page.
- **Trigger:** the next i18n pass, or the first time a founder reviews an Arabic page with prices.
  Decide the notation first, then either add `lang` to `tndPrice` or normalise the 22 `د.ت` strings
  — not both.
- **🔴 ADDENDUM (E1-product PR, 2026-08-10) — this is not only a notation choice, it is an actual
  bidi rendering defect, confirmed in a real browser.** `"1600 TND"` is the correct DOM text on
  every affected page (as the entry above already says), but the VISUAL order under `dir="rtl"` is
  not "1600 TND" — it renders **"TND 1600"**, the two tokens swapped. Per UAX#9 (rules W7/N1/N2): a
  digit run (EN) followed by a space then a strong-LTR letter run (the Latin "TND"), with no
  strong-LTR character preceding the digits, gets reordered so the letter run moves ahead of the
  number under an RTL paragraph — the identical bug class as D1's gallery counter
  ([[reference_rtl_numeric_run_reversal]]-shaped, just EN+L instead of EN+neutral+EN). Confirmed
  live on E1-product's own price rows before they were fixed locally (`dir="ltr"` on each value
  span, matching D1's counter fix) — **not fixed at the source** in this PR, since `tndPrice` has
  five OTHER call sites this PR does not touch, and a source-level fix is exactly the "add `lang` to
  `tndPrice`" work this entry already describes. Whoever picks up this trigger should treat
  `dir="ltr"` (not merely the `د.ت`-vs-`TND` notation) as part of the fix — a locale-aware
  `tndPrice` that still lacks bidi isolation will produce a correctly-worded, still-visually-
  reversed price.

### `aria-label="Fil d'Ariane"` is hardcoded French on both detail pages

- **What:** the breadcrumb `<nav>` on `ProductDetail.tsx` and `ServiceDetail.tsx:142` both carry a
  literal French accessible name, so an Arabic screen-reader user hears "Fil d'Ariane".
- **Why deferred:** D1 copied D2's existing markup deliberately — matching the precedent was the
  right call for a rebuild, and diverging on one page would leave the two detail pages announcing
  their breadcrumbs differently. It is two surfaces and one new i18n key.
- **Trigger:** fix both together with a `common.breadcrumb.label` key. Cheap; just not a D1 change.

### 🔴 PRE-LAUNCH — Google Fonts CDN is a third-party single point of failure for every route

- **What:** `src/app/layout.tsx` loads both platform typefaces — Cairo (AR) and Inter (FR/default)
  — through `next/font/google`. In production this self-hosts and the runtime dependency on Google
  disappears; **in dev (Turbopack), it does not** — the font CSS/files are fetched from
  `fonts.gstatic.com`/`fonts.googleapis.com` at compile time, and because `layout.tsx` is the root
  layout, a failed font module fails the module graph for **every route**, `/connexion` included.
- **Confirmed live, 2026-08-12** (while chasing an unrelated blocked CDP pass, see
  `g2-discovery.md` §26): a genuine Google-side CDN blip caused `fonts.gstatic.com` to 404 on the
  exact Cairo `.woff2` path this app requests, and the dev server 500'd on every route with
  `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'`. Worse: the
  outage **did not need to still be happening** for the app to stay broken — Turbopack's dev cache
  had baked in the failed CSS response (dead asset hashes), so even after Google recovered
  (confirmed by a bare `curl` returning real `200`s), the app kept 500ing until `.next` was deleted
  and the dev server restarted. Two compounding failure modes on one third-party dependency.
- **Why this matters for Tunisia specifically, not just as a general best practice:** per this
  repo's own market anchors (CLAUDE.md), Servyou serves a market where mobile-first,
  intermittent-connectivity access is the norm, not the edge case. A platform whose landing,
  login, and every other page depend on a single external CDN being reachable is a self-inflicted
  outage surface that has nothing to do with Servyou's own infrastructure or Supabase/Vercel
  uptime.
- **Fix:** self-host both font families (download the `.woff2` files, serve them via
  `next/font/local` or a static `/public` path) — removes the runtime Google dependency in dev
  *and* removes any residual build-time fetch dependency in production, where `next/font/google`
  already self-hosts the *output* but still needs to reach Google *once*, at build time, to
  produce it.
- **Why deferred:** not a regression in any open PR, not blocking `feat/g2-success` (the CDP pass
  it was discovered during a dev-server restart + `.next` clear unblocked it fully, so this is a
  resilience gap, not an active bug) — a platform-wide infra change, not this branch's blast
  radius.
- **Trigger:** pre-launch hardening pass, alongside wiring up Sentry (`docs/follow-ups.md:450`
  already tracks the `@sentry/nextjs` dependency bump) — both are "the platform should not go dark
  because of a third party" items and read naturally as one pass.

### ✅ RESOLVED 2026-08-12 — every guarded-page bounce to `/connexion` sends `?next=`, but `SigninForm` only reads `?redirect=`

- **Fixed on `fix/signin-next-param`.** `SigninForm.tsx` now reads `?next=` via a new
  `resolvePostLoginDestination()` (`src/lib/internal-path.ts`), matching all 10 producer call
  sites below. Verified live across three guarded routes (`/mon-compte`, `/parametres`,
  `/ma-boutique/creer/configuration`) plus two crafted external `next` values (`//evil.example.com`,
  `https://evil.example.com`), both correctly rejected and falling back to `/`. Unit tests added
  (`src/__tests__/internal-path.test.ts`) covering the param-name contract itself, including a
  `next` value that carries its own query string, so a future rename back to `redirect` fails a
  test instead of silently regressing. Original write-up kept below for context.

### Every guarded-page bounce to `/connexion` sends `?next=`, but `SigninForm` only reads `?redirect=`

- **What:** `SigninForm.tsx:76` reads the return destination as
  `new URLSearchParams(window.location.search).get('redirect')`. Every server-side guard in the app
  that redirects a logged-out visitor to sign in builds the query string as `?next=` instead —
  confirmed at **10 call sites**: `succes/page.tsx:40` and `configuration/page.tsx:32` (both new in
  this PR), `ma-boutique/creer/page.tsx:33`, `mon-compte/page.tsx:23`, `parametres/page.tsx:18/21`,
  `mes-commandes/[id]/page.tsx:20`, `mes-missions/[id]/page.tsx:30`, `demander/[id]/page.tsx:29`, and
  the shared `require-seller.ts:42` helper (used by `mes-produits/ajouter` and others). `next` is
  never read anywhere under `src/app/connexion/`, including the page component itself
  (`connexion/page.tsx`) which awaits `searchParams` but only forwards `passwordReset`. The result:
  sign in from any guarded page and you land on `/` (SigninForm's own fallback,
  `SigninForm.tsx:85`), not back on the page you were trying to reach — silently, no error, easy to
  miss in a click-through because "landing on the marketplace" doesn't look broken.
- **Surfaced by:** the G2-success CDP verification pass (2026-08-12,
  `g2-discovery.md` §26) — noticed while scripting a real sign-in through `/connexion`, not fixed
  there per "one PR, one focus"; this is a pre-existing, wider-than-this-PR defect, not something
  `succes/page.tsx` introduced (it copied the same `?next=` pattern every other guard already uses).
- **Fix:** either rename every producer's query key to `redirect` (10+ call sites, mechanical, easy
  to grep-verify), or make `SigninForm.tsx:76` read `next` (one line, matches the majority
  convention already in the codebase, and would need `connexion/page.tsx` to also stop dropping it
  if a server-rendered variant of the check is ever added). The second is cheaper and matches what
  every guard already writes — no reason to rename 10 call sites to fix a 1-line reader.
- **Trigger:** next PR that touches `/connexion` or any of the listed guards. Grep
  `?next=` before assuming this list is exhaustive — this pass found it via a full-repo search, not
  a systematic audit of every guard.

### `servyou-pages-elements-and-interactions.md`'s sign-in spec describes role-based landing pages that don't exist

- **What:** `docs/servyou-pages-elements-and-interactions.md:367` (section B.2, sign-in) still says
  "the server action... redirects to the user's appropriate landing page based on their role:
  consumers go to `/`, shop owners go to `/ma-boutique`, freelancers go to `/mon-profil-freelance`."
  `SigninForm.tsx`'s own comment says otherwise: "Role dashboards were removed in the design-phase
  reset... until then there is one destination for all roles" — every role currently lands on `/`.
- **Why deferred:** noticed while fixing the adjacent `?next=`/`?redirect=` param-name bug
  (`fix/signin-next-param`, 2026-08-12) — that fix corrected the param name in the same sentence
  (it's the literal subject of that PR) but did not touch this separate, pre-existing role-landing
  claim, which is wider doc-drift unrelated to the redirect-param fix.
- **Trigger:** whenever role-specific post-login landing pages actually get built, or the next pass
  through this doc for unrelated reasons — cheap to fix (one clause), just not this PR's scope.

### 7 orphaned `shop-assets` storage objects from G2's own verification fixtures — never swept

- **What:** `storage.objects` (bucket `shop-assets`, public, `image/webp` only) holds 7 objects
  across 4 shop-id-shaped folders, all timestamped 2026-08-11, none of which match any `shops.id`
  in the live DB today. These are leftovers from the G2 step-1/step-2 CDP verification passes:
  ephemeral service-role-seeded fixtures (auth user + shop row) that uploaded a real logo/banner
  through the real write path, then had their **DB rows** torn down (`auth.admin.deleteUser`,
  cascading `profiles` → `shops`) — but the **storage objects were never swept**, because the
  teardown scripts (deleted after use, per this repo's own convention) only deleted the DB side.
- **Confirmed live** (`fix/d3`, 2026-08-12): downloaded 3 of the 7 and ran `sharp().metadata()` —
  all decode clean (`webp`, `1024×1024` banner / `512×512` logo, `srgb`). Not corrupt, just
  orphaned. Small (≈4.5–12 KB each, ~50 KB total) — not urgent, but the general problem this is one
  instance of is already tracked (see below) and this repo's own storage-hygiene rule applies.
- **This is a harness/verification-process gap, not a product feature gap.** The general
  "reconciliation sweep" this needs is already tracked at this file's own **"Orphaned storage
  objects need a reconciliation sweep before the first deletable image surface"** entry (line 89) —
  that entry already names `shops.logo_url`/`banner_url` as a future sweep target. This is the
  first concrete instance of exactly what it predicted, arriving via test-fixture teardown rather
  than a real deletable-image-surface PR.
- **Whoever sweeps this must go through the Storage API, never SQL** — this repo's own rule, already
  logged and learned the hard way: **"🔴 Delete storage objects through the Storage API — NEVER
  `delete from storage.objects`"** (line 1650). A SQL delete only removes the metadata row; the
  physical file stays in the S3 backend, still billed, still counted against the 1 GB free tier,
  and now invisible to every future sweep because sweeps enumerate through the metadata.
- **Trigger:** either the general reconciliation-sweep entry's own trigger (first deletable image
  surface), or — cheaper — whoever next writes a CDP verification fixture that uploads to
  `shop-assets` should add a storage sweep to that fixture's own teardown (mirroring
  `scripts/rls-smoke.mjs`'s `sweepSmokeStorage`, which already does this correctly for its own
  buckets — the pattern exists, this class of fixture just didn't use it).

### Admin `signalements` detail page's `TARGET_ROUTES` map has wrong base paths for 4 of 6 target types

- **What:** `src/app/admin/signalements/[id]/page.tsx:52-58` maps `report.target_type` to a base
  path for the "view target" link: `product: '/produit'` (real route is `/produits/[id]`, plural),
  `service: '/service'` (real route is `/services/[id]`, plural) — both singular where the app is
  plural. `shop: '/boutique'` is correct (confirmed while verifying this PR's own D3 route lands
  where every existing caller already expected it). `freelancer_profile: '/freelance'` is also
  unverified — D4 is not built yet, so there is nothing to check it against.
- **Why deferred:** found incidentally while confirming the admin surfaces that link to
  `/boutique/{id}` were shaped correctly (they were) — a different target-type's base path, no
  overlap with D3's own scope.
- **Trigger:** next pass through the admin moderation surfaces, or whenever `/produits`/`/services`
  next changes shape. Two-line fix (`/produit`→`/produits`, `/service`→`/services`), just not found
  by this PR's own walk.

## AppShell Topbar 375px fix + first MarcheLayout→AppShell migration step (`fix/appshell-topbar-and-pitch-pages`, 2026-08-13)

### AppShell Topbar 375px overflow — closed
Fixed the defect logged four separate times above (G9 partial, the E1-era entry, G4, G6) — see
those entries for the fix detail and re-measurement, not repeated here. One entry (G9
`/commandes-recues/[id]`) was a compound bug; only its topbar-cluster half is resolved, `OrderRail`
remains open. S4 (topbar 65px vs Figma's 64px, same component, founder-flagged to ride with this
fix) was deliberately **not** included — out of this PR's stated scope, still open.

### `/devenir-vendeur/{boutique,freelance}` migrated off `MarcheLayout` onto `AppShell` — 2 of 5 done
Reported separately (routing-defect audit, 2026-08-13): a click from the new `/devenir-vendeur`
role-choice screen (`AppShell`) into either pitch page landed on the **old** shell (`MarcheLayout`
— different sidebar, "Publier un projet" CTA, no shell parity). Both pages were confirmed 4-line
swaps (static content, `user` prop only, no `--marche-topbar-h` / `MarcheSidebar` dependency) and
migrated here. Verified live: identical sidebar + topbar across `/devenir-vendeur` →
`/devenir-vendeur/freelance` → `/devenir-vendeur/boutique` (screenshots, 1440 + 375), no "Publier un
projet", no "Mes missions" on any of the three.

**3 of 5 `MarcheLayout` routes remain:** `/` (`ConsumerHomepage`), `/recherche`,
`/categories/[slug]`. All three depend on the cross-engine Produits/Services toggle + stateful
URL-synced search that `AppShell`'s `Topbar` has no equivalent for (`TopbarSearch` is a stateless
box that always redirects to `/recherche`, carries no `q=` or type). Not a swap — needs a new
page-local component, and for `/` specifically a founder call first (does it stay a bespoke browse
surface, or fold into `/marche/produits`, which already has `AppShell` + its own lens toggle).
Scoped as a separate PR ("PR 2"), deliberately not started here.

**Still coupling `AppShell` to the shell it's meant to replace:** `TopBarUser` (type-only, 9 import
sites) still lives in `marche/ProfileAvatarMenu.tsx` — small, mechanical to move to
`lib/marche/shell-user.ts`, but blocked on all 5 routes being off `MarcheLayout` first (can't delete
`ProfileAvatarMenu` while `MarcheTopBar`/`MarcheLayout` still use it). `getInitials` is **already**
fully extracted to `components/ui/initials.ts` and consumed by both shells — the audit's "runtime
coupling" claim on that specific function is stale, not a remaining blocker.

## `/devenir-vendeur/boutique` rebuild (`feat/devenir-boutique-rebuild`, 2026-08-13)

### No seller-specific terms document exists — both pitch pages now link the general one instead
- Both `/devenir-vendeur/{freelance,boutique}` frames drew a role-specific phrase in their
  (now-cut) age-gate module — *"conditions d'utilisation freelance"* / *"... vendeur"*. No such
  document exists anywhere in the app: no route, no file, no string match for a seller- or
  freelancer-specific terms concept outside these two frames' own copy. The only terms document
  that exists is the general one (`src/app/(marketing)/conditions/page.tsx`,
  `LEGAL_DOCS.conditions`, 14 sections, one "Achats et ventes" section covering buying *and*
  selling together — no seller-specific carve-out).
- **Resolution taken (founder ruling):** both pages now share one `TermsLine` component and one
  copy string ("En continuant, vous acceptez les conditions d'utilisation.") linking to the
  general `/conditions` page — the role word ("freelance"/"vendeur") dropped rather than
  promising a document that doesn't exist.
- **Still owed:** a real seller-specific terms document (and, symmetrically, a freelancer one) —
  what it should say is a legal/product question, not an engineering one. Belongs with the
  pre-launch legal-pages pass, not invented here.
- **Trigger:** whenever the pre-launch legal review happens, or before the platform actually
  takes its first seller signups at scale.

### `RoleUpgradeHero.tsx` is now fully orphaned — 0 remaining callers
- Both `/devenir-vendeur/freelance` (`f92d793`) and `/devenir-vendeur/boutique` (this PR)
  rebuilt their heroes single-column, matching their respective frames — neither reuses
  `RoleUpgradeHero` (it's 2-column, wrong shape for either measured frame). Confirmed by grep:
  zero files import it besides its own definition.
- **Not deleted here** — this PR's rulings named `HowItWorks`/`FAQ`/`FinalCTA` specifically for
  deletion (the discovery doc's own finding); `RoleUpgradeHero` going to zero callers is a side
  effect of executing those rulings, not something ruled on directly. Logged rather than deleted
  inline, per "one PR, one focus."
- **Trigger:** next `devenir/` cleanup pass — safe to delete on sight, already confirmed
  zero-caller.

## H2 step 1 "Bases" (`feat/h2-step1-bases`, 2026-08-14)

### `Stepper` is now at its documented third consumer — promote to shared
- G2's `Stepper.tsx` (`ma-boutique/creer/_components/Stepper.tsx:4-8`) explicitly names "promote
  at third consumer" as the rule for when its route-local wizard-stepper component should move
  to a shared location. H2 step 1's own 3-step stepper (`mon-profil-freelance/creer/_components/
  Stepper.tsx`) is that third consumer — same circle/connector/label shape, same component API
  shape (`{ label, state }[]`), copied rather than imported.
- **Not promoted here.** Promoting means editing G2's two existing consumers
  (`ma-boutique/creer/_components/CreateShopForm.tsx` and `configuration/_components/
  ConfigurationForm.tsx`) to repoint their imports at a new shared location — a cross-cutting
  change to G2's already-shipped files from inside an H2 PR, which "one PR, one focus" pushes
  back on.
- **Also unresolved if promoted:** the two existing copies disagree on column width (G2: 80px /
  `w-20`; H2's own frame measured 100px / `w-100`, built at 80px instead —
  `docs/design/h2-discovery.md §8`). A shared component would need to either parametrize the
  column width or pick one value platform-wide; not decided here.
- **Trigger:** whenever H2 step 2 or 3 needs their own stepper instance (a 4th consumer would
  make deferring the promotion harder to justify), or a dedicated component-consolidation pass.

## H2 step 2 "Compétences & langues" (`feat/h2-step2-competences`, 2026-08-14)

### 🔴 10 pre-existing `freelancer_profiles.languages` values, dumped verbatim — NOT backfilled

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

### Shared tag-input (Chip/Combobox) now wanted — second real consumer coming

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

### `freelancer_skills` still has no UPDATE policy — now confirmed an inconsistency, not a pattern

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

### 🔴 `AppShell`'s root wrapper overflows by 16px at 320px — pre-existing, not introduced by step 2

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

## Sidebar Marketplace + legacy shell retirement (`feat/sidebar-marketplace-and-shell-migration`, 2026-08-15)

### TopbarSearch's type inference doesn't widen to /recherche or /categories/[slug]'s own query string — by design, not an oversight

- **What:** `TopbarSearch.tsx`'s type-aware fix infers `type` from PATHNAME only
  (`/marche/services` → `service`, else `product`). It does NOT read the CURRENT page's own
  `?type=` when that page is `/recherche` or `/categories/[slug]` — searching from the shell
  topbar while already on `/recherche?type=service` still resolves to product, because pathname
  alone can't see the current query string's type.
- **Why not widened:** founder call — those two pages carry `type` correctly through their OWN
  page-local `SearchQueryInput` now (it patches the CURRENT url via `buildSearchQuery`, so `type`
  survives automatically). `TopbarSearch` is the fallback path for every OTHER page (freelancer
  dashboard, shop dashboard, `/mes-commandes`, etc.), not the primary way to search from within an
  already-type-scoped result set — widening it to parse the current query string would duplicate
  logic the page-local input already owns correctly.
- **Trigger:** only if click-through shows visitors reaching for the topbar search while deep in a
  service-scoped `/recherche` or category results and getting silently bounced to products. Until
  then this is an accepted, named gap, not a bug queue item.

### `TopBarUser` type still lives in the deprecated-looking `ProfileAvatarMenu.tsx`

- **What:** `MarcheLayout.tsx` / `MarcheSidebar.tsx` / `MarcheTopBar.tsx` are deleted in this PR,
  but `ProfileAvatarMenu.tsx` stays — 8 files (`shell/AppShell.tsx`, `AppShellClient.tsx`,
  `Topbar.tsx`, `TopbarUserMenu.tsx`, `home/ConsumerHomepage.tsx`, `lib/marche/shell-user.ts`, and
  `ProfileAvatarMenu.tsx` itself) import the `TopBarUser` **type** from it; only `MarcheTopBar.tsx`
  (now deleted) ever imported the `ProfileAvatarMenu` **component** at runtime.
- **Why not moved here:** a type relocation ripples all 8 import sites for a rename with zero
  behavior change — out of scope for a PR about the sidebar and the marketplace shell migration.
- **Trigger:** the next PR that touches the shell — move `TopBarUser` to `shell/` (or a shared
  types module) and update the 8 import sites in the same commit, then `ProfileAvatarMenu.tsx`
  itself can be evaluated for deletion or a rename to reflect what it actually still does.

### Five marche/* components are now true orphans (zero importers) — not deleted here

- **What:** deleting `MarcheTopBar.tsx`/`MarcheSidebar.tsx` orphaned five components nobody else
  imports: `ExpandableSearch.tsx`, `NavTextLinks.tsx`, `HelpDropdown.tsx`, `PublishProjectCTA.tsx`,
  `SidebarSelectFilter.tsx` (grep-verified zero real importers, repo-wide). Also orphaned inside
  `lib/marche/marche-routing.ts`: the `toggleDestination`, `homeEngineHref`, and
  `resolveMarcheSidebarNav` exports (the last was already partly dead — `produitsActive`/
  `servicesActive` were computed and unit-tested but never consumed even before this PR).
  `marche-routing.ts` itself survives: `marcheRedirectTarget` is still used by `/marche`'s own
  redirect route, unrelated to this migration.
- **Why not deleted here:** the ruling for this PR named exactly three files for deletion
  (`MarcheLayout.tsx`, `MarcheSidebar.tsx`, `MarcheTopBar.tsx`). Expanding deletion to their
  now-orphaned dependents is a reasonable next step but a distinct one — "one PR, one focus,"
  same posture PR #83 (`chore/strip-legacy-consumer-ui`) took with its own cascade.
- **Trigger:** a dedicated cleanup commit — grep each name repo-wide to reconfirm zero importers
  (components can gain a new consumer between now and then) before deleting.

### AppShell has no site Footer — /recherche, /categories/[slug], and / (consumer landing) lose theirs in this migration

- **What:** `AppShellClient.tsx` renders sidebar + topbar + content, no `<Footer>`. `MarcheLayout`
  rendered one unconditionally. The three routes migrated in this PR lose their footer as a result.
- **Why this isn't new scope:** `/marche/produits` and `/marche/services` made the identical trade
  when they moved to AppShell earlier (`feat/rebuild-marche-services` and the produits rebuild) —
  this PR extends an already-accepted gap to three more routes, it doesn't introduce it. No
  existing follow-up entry named it before now.
- **Trigger:** whenever AppShell's own footer situation gets a real design decision — a persistent
  footer slot, or an explicit call that authenticated/browse surfaces don't need one.

### ConsumerHomepage's thin-landing card is INFERRED, no measured frame

- **What:** `/`'s new thin landing (`ConsumerHomepage.tsx`) — greeting + one card with two CTAs
  into `/marche/produits` and `/marche/services` — has no Figma frame behind it. Kept deliberately
  minimal (reused `PageHeader` + one `CARD_SHADOW` card, one new i18n key pair
  `home.landing.body`) rather than invent a bespoke landing design without a frame to build
  against.
- **Trigger:** if/when a Figma frame for this surface exists (quota permitting), reconcile against
  it — this is a functional placeholder, not a claimed-final design.

## G3 — Modifier ma boutique (`feat/g3-shop-edit`, 2026-08-15)

### New follow-up class: replacing a shop logo/banner deletes the OLD object in-action — distinct from the CASCADE-orphan sweep

- **What:** `ma-boutique/modifier/actions.ts`'s `updateShopAsset` reads the shop's current
  `logo_url`/`banner_url` before uploading a replacement, uploads the new object to a fresh path,
  points the column at it, and only THEN deletes the old object via the Storage API
  (`.remove([oldPath])`) — never SQL. If that delete fails it is logged and the update still
  stands: a stranded object beats a lost image.
- **Why this is a NEW class, not a duplicate of "Orphaned storage objects need a reconciliation
  sweep" (line 119):** that entry is about a shop ROW disappearing (CASCADE to `products` →
  `product_images`) with no application code in the path at all — nothing to hook an in-action
  delete onto, hence "sweep, not prevent". This one is the opposite shape: a single, precisely
  known object being replaced by application code that IS in the path, so an in-action delete is
  both possible and sufficient. `shops.logo_url`/`banner_url` no longer need the periodic sweep to
  catch a replace — only a shop DELETION (still unbuilt) would still orphan one that way.
- **Also added, same file:** `removeShopBannerAction` — `BannerField`'s reused "Retirer l'image" X
  reads as "undo my unsaved pick" when a local file is staged, but as "delete my banner" when what
  is showing is the stored `banner_url`. The second case needed a real delete path (null the
  column, then remove the object) that create-mode never needed, since create-mode has nothing
  stored yet to delete. Mirrors `mon-compte/actions.ts`'s `removeAvatarAction`.
- **Trigger:** none — this is the closure, logged for future readers who go looking for how
  shop-asset replacement handles the old object.

### `/ma-boutique/creer/configuration`'s primary CTA and redirect assume onboarding — now reachable from a live shop too, left unfixed

- **What:** G3 adds a link from `/ma-boutique/modifier` to `/ma-boutique/creer/configuration` (and
  a reciprocal link back), so a returning owner can now reach that page from an already-live shop —
  not only via the onboarding wizard's own "Suivant", the only path that existed before. But
  `ConfigurationForm.tsx`'s primary button is unconditionally labelled `t('boutique.action_create')`
  ("Créer ma boutique") and its success redirect always goes to `/ma-boutique/creer/succes` — both
  correct for the wizard, both WRONG for an owner who is just updating settings on a shop that
  already exists: the copy claims to create a shop that is already created, and the redirect lands
  on the "your shop was just created" screen a second time.
- **Why not fixed in this PR:** the founder's ruling scoped this PR to exactly "two link
  additions" and explicitly flagged `ConfigurationForm.tsx` as a previously-shipped file (PR #129) —
  authorizing the link, not a behavior change to that file's label/redirect logic. Distinguishing
  "reached via onboarding" from "reached via a live shop's edit page" needs a real signal (e.g. a
  `?from=` param threaded through both the page and the form, or a query for whether the shop has
  already passed `/succes`) that is its own small design decision, not a link addition — "one PR,
  one focus."
- **Trigger:** next time `ConfigurationForm.tsx` is touched, or the first report of a returning
  owner seeing "Créer ma boutique" / the creation-success screen on a shop that already exists.

### Corrected two stale claims found during G3 discovery

- **`shops.preferred_carriers` "unused"** (this file, "orders.carrier is seller-writable…" entry):
  was accurate when written, stale since PR #129 gave it a real writer
  (`/ma-boutique/creer/configuration`'s "Livraison" accordion). Corrected in place above — the
  column is written now; G9 still doesn't read it into the order form, which is the part that
  remains open.
- **`docs/design/d1-discovery.md:237`, "Logo boutique… settable nowhere":** was accurate pre-G3 (G2
  could only set it once, at creation, with no revisit path). Corrected in place — G3 is the
  revisit/edit path that closes it, so the row and the summary table's row C are marked resolved
  rather than deleted, per the founder's instruction to narrow rather than remove.

## D3 fidelity re-audit — sparse live data, and the standing rule it forces (`fix/d3`, 2026-08-13)

### Founder audit: were the shop_type/delivery_setup meta bits and PAIEMENT/CATEGORIES chip rows built, or never built?
- **Question:** OM shop (the only live shop) renders name, city, "Boutique depuis juin 2026",
  description, and the actions row — no shop-type bit, no delivery-setup bit, no chip sections.
  Same question the GATE-DESIGN PRINCIPLE entry above already asks in a different shape: does the
  live page's silence mean the region is absent, or that it was built and is correctly hidden?
- **Answer, read from `ShopDetail.tsx` directly, not inferred from the live render:** built and
  correctly hidden, all four. `const hasMeta = Boolean(shop.shopType || shop.deliverySetup)`
  gates the shop-type/delivery-setup pair (`{hasMeta && (...)}`, each bit additionally
  individually gated inside); `{(shop.paymentMethods.length > 0 || shop.categories.length > 0) &&
  (...)}` gates the chips block, with PAIEMENT and CATEGORIES each independently gated inside
  that by their own `.length > 0`. OM shop has `shop_type`/`delivery_setup` both null and zero
  rows in both join tables (confirmed live in `d3-discovery.md` §3) — every one of these
  conditions is false for the only shop anyone can look at, which is why an unbuilt region and a
  correctly-hidden one were indistinguishable on sight. No code defect found; no code change made.

### 🔴 STANDING RULE: exercise every conditional region with data that makes it render, before calling a page verified
- **Extends the GATE-DESIGN PRINCIPLE entry above** (this file, under "G8 — Commandes reçues"):
  that entry's third bullet already covers *interactive* default-state blindness ("measuring a
  control in its default state is not evidence about its other states — open the panel, expand
  the row"). This is the same blindness in *data* form: a nullable/optional field that happens to
  be null on the one live row and a region that was never built produce the identical rendered
  output. Checking a page against whatever the live database currently holds cannot tell the two
  apart — it isn't a gate on that dimension, it's a formality, per the principle above.
- **Required step, from now on:** before declaring any page verified, seed a temporary fixture
  that populates every optional field the frame draws, screenshot the page in that state, then
  tear the fixture down. The populated-state screenshot — not the sparse-data one — is what gets
  compared against the Figma frame.
- **Trigger:** before declaring any page verified whose Figma frame draws a region backed by a
  nullable column, an optional join table, or any other field that can legitimately be empty.

## D3 banner-fix recovery (`fix/d3-banner-recovery`, 2026-08-16)

### 🔴 STANDING RULE: a commit pushed to a branch after its PR has merged goes nowhere — verify the fix landed on `main`, not just that the work was done
- **What happened:** `2f5a65b` ("fix(shop): render the real D3 banner…") was written and
  DOM-verified on branch `fix/d3` — but PR #132, on that same branch, had already merged the day
  before (Aug 12). No second PR was opened for the follow-up commit, so it sat stranded on the
  orphaned `fix/d3` branch for three days until a founder screenshot caught the still-broken
  banner and forced a rediscovery (`fix/d3-banner-recovery`, this section).
- **Why it's dangerous:** the branch still exists, still has the commit, `git log` on it looks
  completely normal — nothing about the local state signals "this never shipped." The only way to
  know is to check whether the commit is reachable from `origin/main`, and nobody did that before
  treating the fix as done.
- **Rule, from now on:** after any fix commit, confirm it actually landed —
  `git merge-base --is-ancestor <commit> origin/main` (or: is it in a *merged* PR, not just a PR
  that exists) — before considering the work complete. A commit existing on a branch, even a
  DOM-verified one, is not evidence it shipped. Any fix made after a PR has merged needs its own
  branch and its own PR; it cannot ride the merged branch's coattails.
- **Trigger:** standing — apply this check whenever picking up a "didn't this already get fixed?"
  report, and as a habit after every fix commit going forward.

### `Avatar`'s `<Image>` sets no `priority` — a real LCP concern on a page sellers share publicly
- **What:** `Avatar` (`src/components/ui/avatar.tsx`) never passes `priority` to its
  `<Image src={src} fill … />`. On D3 (`/boutique/[id]`) the shop's own avatar sits inside the
  hero, above the fold — very plausibly the page's LCP element — yet it renders as a default
  lazy-loaded image. Observed directly during this PR's re-verification: a CDP capture at 1440px
  caught the avatar image not yet painted at screenshot time, while the same page at 375px had
  already painted it. Consistent with lazy-load timing, not a data bug.
- **Why it matters more here than on an average internal page:** D3 is the one route a seller puts
  in a bio link and shares externally — the audience landing on it cold, with no warm cache, is
  exactly the audience LCP timing affects most.
- **Not fixed here** — out of scope for a banner-fix recovery PR, and `Avatar` is a shared
  primitive (topbar avatar, D4, G3's preview, etc.); adding `priority` needs to be conditional per
  call site (the standalone hero usage, not every 40px topbar instance), plus a check that no page
  ends up with more than one `priority` image (Next.js flags that).
- **Trigger:** a small, dedicated PR — thread a `priority?: boolean` prop through `Avatar`, set it
  `true` on D3's hero avatar (and D4's, once checked) only.

## F1 Mes favoris (`feat/f1-favoris`, 2026-08-16)

### `BlurFade` (magicui) throws a React hydration-mismatch console error on every page that uses it — pre-existing, not introduced by this PR
- **What:** motion/react serializes `style.opacity`/`style.filter`/`style.transform` as numbers
  on the client but the SSR pass emits them as strings ("0" vs `0`, etc.), so React logs "A tree
  hydrated but some attributes of the server rendered HTML didn't match the client properties" —
  Next's dev overlay surfaces it as a "1 Issue" toast. Confirmed via CDP (`Console Error` +
  full component stack pointing at `src/components/magicui/blur-fade.tsx:75`).
- **Not specific to F1** — reproduced identically on `/marche/produits` (`ProductBrowseGrid` →
  `BlurFade`), which predates this PR and never touched `mes-favoris`. `ListingResults`
  (`src/components/listings/ListingResults.tsx`), reused here per Ruling 3, wraps every
  card in the same `BlurFade`, so `/mes-favoris` inherits the same warning — it did not create it.
  Matches the "BlurFade opacity-0 hydration false-positive" gotcha already on file from earlier
  visual-gate passes.
- **Not fixed here** — `BlurFade` is a shared entrance-animation primitive used across
  `/recherche`, `/categories/[slug]`, the consumer homepage, `/marche/produits`, `/marche/services`
  and now `/mes-favoris`; the fix belongs in `magicui/blur-fade.tsx` itself (likely coercing the
  animated style values to a consistent string/number shape before the first paint), not in any
  one caller.
- **Trigger:** a small, dedicated PR against `src/components/magicui/blur-fade.tsx`.

### `shared/PageHeader` silently absorbs the page's only `<h1>` on 6 other callers — headings audit needed

- **What:** this PR fixed the mechanical defect on `/mes-favoris` and `/mes-missions` — both
  imported `shared/PageHeader` (aliased `PageSubtitle`) alongside `marche/PageHeader`, but never
  passed `marche/PageHeader`'s `title`, so the animated *subtitle* component ended up rendering
  the page's only `<h1>`. Fixed via a new `as?: 'h1' | 'p'` prop (default `'h1'`) on
  `shared/PageHeader`, `as="p"` + a real `title` on both fixed pages. See
  `docs/design/f1-discovery.md` §1 for the full trace.
- **Not fixed — 6 other callers of `shared/PageHeader`, each a different shape, each needing its
  own Figma read to resolve (quota exhausted this cycle):**
  - `mes-missions/nouvelle/page.tsx`, `recherche/page.tsx`, `categories/[slug]/page.tsx`,
    `ConsumerHomepage.tsx` (`/`) — no `marche/PageHeader` import at all, so `shared/PageHeader` is
    the page's *only* heading, ever. `/recherche`'s only renders when a query has results (zero
    `<h1>` on the landing/empty state); `/categories/[slug]` shows a dynamic "{count} produits
    dans {category}" line instead of the category name as a static title; `/` (`ConsumerHomepage`)
    is explicitly a thin, un-measured landing (no Figma frame exists for it at all — see the
    "INFERRED" note at `ConsumerHomepage.tsx:18`). Whether any of the four needs a distinct static
    `<h1>` is a per-page Figma question, not something to infer.
  - `profil/page.tsx` and `parametres/page.tsx` — **duplicate `<h1>`s**, the opposite shape:
    `shared/PageHeader`'s subtitle renders one `<h1>`, and a second, separate `<h1>` already
    exists (`profil/page.tsx:24`; `ParametresForm.tsx:88`, reading `t('parametres.title')`).
    `/profil` is explicitly marked a temporary stub ("full profile surface returns in a
    follow-up commit") pending its own rebuild.
- **Why not widened here:** the founder's own instruction on this PR — "those are per-page Figma
  questions and the quota is gone; do not widen scope on inference." Fixing 6 more pages on a
  guess about what each one's frame actually specifies is exactly the inference this PR was told
  not to do.
- **Trigger:** a dedicated headings-audit PR once Figma quota resets — pull each of the frames that
  have one (ConsumerHomepage has none — see above), decide per page whether `shared/PageHeader`
  needs a sibling `marche/PageHeader` (or, for `profil`/`parametres`, whether the *existing*
  second `<h1>` should just win and `shared/PageHeader` there switch to `as="p"`), and fix all 6
  in that one pass so it doesn't fragment into six small PRs each re-deriving this same list.
- **🔴 ADDENDUM (2026-08-16) — `/mes-favoris` and `/mes-missions` no longer call
  `shared/PageHeader` at all.** A screenshot after this fix shipped showed both pages rendering
  *two* headers stacked (the `as="p"` subtitle band on top, the real `<h1>` below) — the `as` prop
  stopped the double-`<h1>` a11y defect but never addressed double-rendering. Founder ruling: drop
  the `PageSubtitle` call entirely on both pages, `marche/PageHeader`'s `title` stays as the sole
  heading. Basis: two independent founder reads of `718:60584` both describe a title only, no
  subtitle line; `/mes-missions` has no frame at all (see next entry) so matching its sibling is
  the right default over inventing a subtitle for it. `shared/PageHeader` itself is untouched —
  its `as` prop and its other 6 callers are unaffected; this only removes 2 of the 8 call sites,
  leaving 6.
- **🔴 `/mes-missions` has no Figma frame mapped at all** — `docs/reality-sync/master-matrix.md:133`
  lists it `NONE 🔴 Zone F gap`. Every heading decision made for this page (this PR's title string,
  the subtitle removal above) is inferred from its sibling `/mes-favoris`, not measured against
  any frame. Not a defect to fix — there's nothing to measure against — but any future claim that
  `/mes-missions`'s header is "correct" should be read as "consistent with `/mes-favoris`," not
  "Figma-verified."

### `shared/PageHeader`'s `emphasisWord` renders as a blue underlined span with no interactivity — reads as a dead link

- **What:** on every caller that passes `emphasisWord`, the matched substring gets
  `text-brand-blue-600` plus an animated `.ph-underline` bar drawn under it (`globals.css:269-289`)
  — visually identical to a link. The span carries no `href`, no `onClick`, is not focusable, and
  has no pointer cursor. Surfaced while investigating the `/mes-favoris` double-header stack (the
  subtitle band carrying this treatment was one of the two things founder-screenshotted); the
  band itself is now removed on `/mes-favoris` and `/mes-missions` (see addendum above), so this
  no longer applies to those two pages specifically — but the same treatment is still live on
  `shared/PageHeader`'s other 6 callers (`recherche`, `profil`, `parametres`,
  `mes-missions/nouvelle`, `ConsumerHomepage`, `categories/[slug]`), on 5 of which it renders
  directly on the page's actual `<h1>` text.
- **Not a ruled defect — logged as an open question.** This is `shared/PageHeader`'s core visual
  signature (`shared/PageHeader.tsx:3`, "Premium animated subtitle row"), not a one-off mistake;
  whether a non-interactive link-styled span on a page's main heading is acceptable is a
  component-level design call, not something to infer from one page's screenshot.
- **Trigger:** a founder ruling on `shared/PageHeader`'s emphasis treatment — either keep it
  (documented as intentional, not a link despite the visual read) or replace the blue+underline
  pairing with a non-link-coded accent (e.g. weight or a different color that isn't the interactive
  brand-blue).

### `SegmentedControl`'s solid blue pill vs. the quiet frame — founder-ruled for F1, four implementations still unconsolidated

- **What:** `/mes-favoris`'s tab switcher rendered `SegmentedControl`'s active state — a solid
  `bg-brand-blue-600` pill with white text and a Motion sliding-indicator animation. Figma
  `718:60584` draws the tabs as plain text labels with the active one on a subtle light
  background — quiet, low-contrast, no blue fill. Founder ruling: *"the switcher toggle buttons
  are not the same we build in figma, they should be like all the other pages."*
- **The "other pages" aren't one pattern — checked, not assumed.** `ProduitsLensToggle` (Figma
  `578:42513`), `ServicesLensToggle` (`661:53879`) and `OrdersTabs` (`709:59668`/`710:59947`) are
  all quiet (white active pill, no blue fill) but split on token: `ServicesLensToggle` and
  `OrdersTabs` both use `bg-surface-pill` + `shadow-sm`; `ProduitsLensToggle` alone uses
  `bg-surface-sunken` + `shadow-xs`. Two-vs-one, and the two don't average out to a third answer —
  one of the three is simply built on a different token pair than the other two. None of the three
  is a stateful client-rendered tab switcher either: `ProduitsLensToggle` and `OrdersTabs` are
  static server components (URL-driven / permanently-fixed selection), so "matches the siblings"
  is a claim about visual tokens, not about matching component architecture.
- **Fixed here, F1-local only, ruled by the frame itself, not by majority vote among the
  siblings:** `get_variable_defs` on `718:60584` returned `surface/sunken` (not `surface/pill`),
  `text/primary`, `text/secondary`, `radius/lg`=10, `radius/md`=8. That matches
  `ProduitsLensToggle`'s token pair, not `ServicesLensToggle`/`OrdersTabs`'s — which means those
  two may themselves be off, or were built against different frames with different tokens; that's
  unverified and out of scope here. `FavorisTabs` now renders bespoke markup on
  `ProduitsLensToggle`'s exact classes (`bg-surface-sunken` track, `bg-white` + `text-text-primary`
  + `shadow-xs` active pill, `text-text-secondary` otherwise) because those are the tokens the F1
  frame actually specifies. `SegmentedControl` itself was deliberately left untouched — no variant
  prop was added.
- **Not fixed — `SegmentedControl`'s other two callers were never checked against a frame at all:**
  `ParametresForm`'s FR/AR language toggle and `SharedSearchBar`'s Produits/Services search toggle
  (topbar, `/recherche`, `/marche`) both use `SegmentedControl` with no Figma citation next to
  either call site. Whether they're correct or also wrong — and whether `ServicesLensToggle`/
  `OrdersTabs`'s `surface-pill`/`shadow-sm` pair is right for their own frames or is itself a
  drift — is unknown without pulling all the frames together.
- **Why not consolidated here:** four separate implementations of one "pill toggle" idea, with at
  least one confirmed internal token disagreement among the three "quiet" ones, is a design-system
  consolidation question, not an F1 bug fix. Deciding whether `SegmentedControl` should become the
  one shared abstraction (and which token pair is actually correct) needs its own frame reads
  across all of `ParametresForm`, `SharedSearchBar`, `ProduitsLensToggle`, `ServicesLensToggle` and
  `OrdersTabs` together — scope this PR was told to stay out of.
- **Trigger:** a dedicated design-system PR: pull frames for `ParametresForm`'s and
  `SharedSearchBar`'s toggles, resolve the `surface-sunken`/`shadow-xs` vs. `surface-pill`/
  `shadow-sm` split against each one's own frame, decide whether `SegmentedControl`'s default
  needs to change (or the bespoke siblings fold into it), and fix all of it together so it doesn't
  fragment into per-page patches again.

## G7 — Modifier un produit (`feat/g7-modifier-produit`, 2026-08-17)

### `ProductForm`'s post-create redirect targets `/tableau-de-bord-vendeur` on reasoning that is now stale

- **What:** `ProductForm.tsx`'s `submit()` ends with `router.push('/tableau-de-bord-vendeur')`, and
  the comment directly above it explains why: "G5 /mes-produits is unbuilt, so the dashboard is
  where a new product is visible." G5 shipped (`feat/g5-mes-produits`, merged as PR #145, ancestor
  of `origin/main` as of this PR) — `/mes-produits` is a real page now, and it is the page a seller
  would actually expect to land on after publishing a product, not the dashboard's stat tiles.
- **Not fixed here** — this PR (G7) touches the edit surface, not the create one, and one-PR-one-
  focus means a create-flow redirect change doesn't ride along on an edit-flow PR.
- **Trigger:** a small, dedicated one-line PR against `ProductForm.tsx:122` (and its now-stale
  comment at lines 115-121), changing the redirect target to `/mes-produits`.

## PR-C — Mes annonces list rebuild (`feat/annonces-list-ds`, 2026-08-22)

### `job_post_skills` is publicly readable — a direct query (not through `job_posts`) would leak skills off posts the caller can't read

- **What:** `job_post_skills` RLS is `for select using (true)` — fully public, with no status or
  ownership check of its own. `getMyAnnonces`/`getAnnonceDetail` are safe because the embed hangs
  off a `job_posts` query already scoped (`.eq('consumer_id', userId)` / RLS's own `status='open'
  or consumer_id=auth.uid()`); the join direction is what protects the read, not the table's own
  policy. A hypothetical direct `.from('job_post_skills').select(...)` call would return skill text
  for non-`open`, non-owned posts — e.g. another consumer's still-drafting or filled post.
- **Not fixed here** — no such direct-query call site exists today, so there is nothing to patch;
  this is a standing gap in the table's own RLS, not a bug in this PR's code.
- **Trigger:** the next PR that adds a `job_post_skills` read path that does NOT go through a
  pre-scoped `job_posts` join (e.g. a global skills-autocomplete endpoint) — add a real policy
  (`exists (select 1 from job_posts jp where jp.id = job_post_id and (jp.status = 'open' or
  jp.consumer_id = auth.uid()))`, mirroring `job_posts`' own SELECT policy) before shipping it.

### `tndAmount()` has no thousands separator — confirmed unsafe to fix inside this PR alone

- **What:** PR-C's brief flagged this and asked for an assessment before touching it. `tndAmount()`
  (`listing-utils.ts`) is a bare `Number.isInteger(n) ? String(n) : n.toFixed(2)` — a 5-figure
  budget renders as `45000 TND`, not `45 000 TND` (French grouping uses a space, not a comma, so
  this isn't even a one-line `toLocaleString()` swap without picking the right locale/separator).
- **Why not safe to change alone:** 9 real call sites outside this PR depend on the current
  no-separator format — `ProductRequestForm.tsx`, `ProductDetail.tsx`, `ProductRow.tsx`,
  `demander/succes/page.tsx`, `ProductBrowseCard.tsx`, `ProductListingCard.tsx` — spanning products,
  service requests and order confirmation, several with their own snapshotted price displays.
  `listing-utils.test.ts` also asserts the current bare-digit format directly, so changing the
  formatter breaks that suite too. This is a cross-cutting formatting decision, not a mes-annonces
  fix.
- **Trigger:** a dedicated formatting PR — pick the French grouping convention explicitly (with the
  founder), update `tndAmount()`/`tndPrice()` once, and update `listing-utils.test.ts` alongside it
  so every consumer moves together instead of drifting call-site by call-site.

### `card-premium` vs `ServiceListingCard`'s 2px-outline treatment — two competing "premium card" looks, unreconciled

- **What:** this PR's rebuilt `AnnonceCard` uses `.card-premium` (white, soft blue-tinted shadow,
  `-translate-y-0.5` lift on hover) — the SAME family of card treatment as `ProductListingCard`,
  G5's `ProductRow`, and roughly a dozen other surfaces. `ServiceListingCard` instead uses a solid
  `2px border-brand-blue-600` outline + `CARD_SHADOW`/`HOVER_SHADOW` — visually a different
  "premium" language for what is conceptually the same idea (an owner/browse card in a 3-up grid).
  PR-C's brief named this split explicitly and ruled it out of scope: ~11 call sites, a platform-
  wide design-system call, not a mes-annonces decision.
- **Not fixed here** — `AnnonceCard` stayed on `.card-premium` (its pre-existing treatment,
  unchanged by this PR) rather than picking a side.
- **Trigger:** a dedicated design-system PR that inventories all ~11 call sites of both treatments
  and either reconciles them into one, or documents why grid-browse cards (services) and
  list/account cards (products, annonces) are deliberately different.

### `WhatsAppContactButton`'s `size="sm"` renders at 36px — under the project's 44px touch-target rule, now on three surfaces (PR-E, `feat/annonces-detail-ds`, 2026-08-22)

- **What:** `size="sm"` is `h-9` (36px). It has no mobile touch-target affordance the way `Button`
  does (`Button`'s `size="md"` ships an invisible `absolute -inset-0.5` hit-area extender —
  `components/ui/button.tsx:122-124` — specifically because a 40px box is itself under 44px;
  `WhatsAppContactButton` has no equivalent). Confirmed live at 375px on the new annonce-detail
  response cards: `sm` is a small, start-aligned pill, not full width.
- **Not new to this PR** — `sm` was already 36px on G8's `OrderActionRow` and G9's
  `commandes-recues/[id]` row usage before PR-E; this PR is the third surface to inherit it, not
  the first to introduce it. PR-E's own AnnonceDetail rebuild used `size="sm"` deliberately
  unmodified (see the next entry) rather than fix the primitive from inside a page-level PR.
- **Also not fixed here — mobile full-width regression, deliberately reported rather than forced:**
  the OLD hand-rolled WhatsApp button on `/mes-annonces/[id]` was `h-10 w-full sm:w-auto` (full-width
  below `sm`). `WhatsAppContactButton` accepts no `className` and forwards no other props onto its
  root — there is no supported way to restore that from a caller. The only technique that would
  reach it is an arbitrary descendant selector on a wrapper (e.g. `[&_button]:w-full`) piercing into
  the component's undocumented internal `div > button` structure — no precedent for that pattern
  exists anywhere in this codebase (grepped), and it would silently break the moment
  `WhatsAppContactButton`'s internal markup changes for an unrelated reason. Founder ruling
  (2026-08-22): do not force it; report and leave `/mes-annonces/[id]`'s mobile Contact button
  non-full-width rather than add a fragile selector hack.
- **Trigger:** a dedicated `WhatsAppContactButton` pass that (a) adds the same touch-target hit-area
  extension `Button` already has for `sm`, and (b) adds either a `fullWidthOnMobile` prop or a
  `className`/wrapper contract so callers can opt into a full-width bar without reaching into
  internals — fixing both `OrderActionRow`'s pre-existing 36px and this page's lost full-width bar
  in the same pass, since they're the same root cause (no external sizing hook on the component).

### `DeleteProductModal` has no focus trap, no Escape-to-close, no scroll-lock — the a11y wiring `ConfirmModal` now has and it doesn't (PR-E, `feat/annonces-detail-ds`, 2026-08-22)

- **What:** PR-E's brief asked for `DeleteProductModal` (`components/produits/DeleteProductModal.tsx`)
  to replace `/mes-annonces/[id]`'s hand-rolled delete dialog. Discovery found the opposite gap: this
  page's existing dialog already had focus-into-dialog, Escape-to-close and scroll-lock;
  `DeleteProductModal` has `role="dialog" aria-modal="true"` (lines 60-65) and nothing else — no
  `useEffect`, no keydown listener, no scroll-lock, no ref, relying on the dialog role alone. Swapping
  it in would have been an accessibility regression, not a consolidation, so the ruling kept this
  page on its own behavior and moved only its visuals onto tokens and `Button`'s danger variant. The
  new `ConfirmModal` (`components/marche/ConfirmModal.tsx`) that resulted has all four: initial
  focus, focus-restore-on-close, Escape, scroll-lock, and (as of the follow-up fix in the same PR) a
  real Tab/Shift+Tab cycle between Cancel and Confirm — behavior-verified in
  `src/__tests__/confirm-modal.test.tsx`, not just visually.
- **Not fixed here** — `DeleteProductModal` is unchanged except for moving onto the `--overlay-scrim`
  token; its a11y wiring is still just the bare dialog role. It is shared by two call sites today:
  `mes-produits/_components/ProductRow.tsx` (G5, kebab-menu delete) and
  `mes-produits/[id]/modifier/_components/EditProductForm.tsx` (G7, DangerZone delete) — both
  currently ship the gap.
- **Trigger:** a dedicated `DeleteProductModal` a11y pass, built from `ConfirmModal`'s wiring (not the
  reverse — `ConfirmModal` is the more complete implementation despite being the newer component):
  add the same mount-focus/restore-on-close effect, the same Escape+Tab-trap keydown handler, and the
  same scroll-lock. `DeleteProductModal`'s typed-keyword input adds a third focusable descendant the
  trap's `first`/`last` logic already generalizes to (any number of focusable elements), so the
  handler can likely be lifted close to verbatim rather than rewritten.

## Pluralization helper + AR fixes (`feat/i18n-plurals`, 2026-08-23)

### `consumer.dashboard.orders.confirm_count` still holds literal French in `ar.ts` — found, not fixed here

- **What:** while migrating `consumer.dashboard.orders.count_one`/`count_many` (which held literal
  French in `ar.ts` — fixed in this PR by the migration to `tn()`), the adjacent key
  `consumer.dashboard.orders.confirm_count` (`"{n} à confirmer"`, rendered in
  `ActiveOrdersSnapshot.tsx` next to the migrated line) turned out to have the exact same defect:
  its `ar.ts` value is the same literal French string, untranslated.
- **Why deferred:** not named in this PR's brief (which scoped exactly two keys), and it is not a
  plural-agreement bug — "à confirmer" doesn't inflect by count, so it needs a straight translation
  fix, not `tn()`. Per the standing PR-discipline rule, an out-of-scope bug found mid-PR gets logged,
  not fixed inline.
- **Trigger:** next AR-copy pass, or bundle it with any future touch of `ActiveOrdersSnapshot.tsx`.
  Needs a real Arabic translation for "{n} à confirmer" (e.g. "{n} بانتظار التأكيد").

### `boutique.public.products_count` and `seller.dashboard.tile.profit_sub` — real one/two data doesn't exist yet

- **What:** `tn()`'s `one`/`two` variants for these two keys are unit-tested but not
  screenshot-verified against real data — the live DB has exactly one shop (25 active products, so
  only the `other` bucket is reachable for `products_count`) and no delivered order yet carries a
  `unit_price_tnd` snapshot (so `profit_sub` never renders at all today — `netProfit` stays `null`
  and the muted "profit_soon" tile shows instead, per the existing phase-aware gating).
- **Why deferred:** seeding a second shop or backfilling a price snapshot to force a screenshot
  wasn't worth the blast radius on production data for a text-wiring check the unit tests already
  cover deterministically.
- **Trigger:** once a second real shop or a snapshot-bearing delivered order exists, confirm
  `boutique.public.products_count` / `seller.dashboard.tile.profit_sub` render correctly at 1 and 2
  in situ (both AR and FR).

### `mesannonces.expiry_countdown` cannot be screenshot-verified with ANY real data today — the countdown window itself is unreachable, not just a specific count

- **What:** `getExpiryCountdownDays()` (`lib/marche/annonce-expiry-countdown.ts`) only returns a
  number inside the **last 7 days** of a post's 30-day life — outside that window it returns `null`
  and `AnnonceCard` renders no countdown chip at all. The 6 real `job_posts` rows are either ~46
  minutes old or ~80 days old; none falls in the 23-29-day window that would make the chip render.
  So this key can't be proven live at ANY count today, not even `other`.
- **Why deferred:** the gap is in the data (no post is the right age), not in the code. Backdating
  a real post's `created_at` to force the window, or waiting three weeks for the new one to enter
  it, wasn't worth doing for a screenshot when `plurals.test.ts` already asserts the exact FR/AR
  strings the component calls `tn()` with.
- **Trigger:** once a real post naturally sits in its last 7 days, confirm the chip renders "Expire
  dans {n} j" (FR) / the correct one-يوم / two-يومين / other-أيام form (AR) in situ.

### `mesfavoris.count` cannot be screenshot-verified at all — the `favorites` table has zero rows in the live DB

- **What:** every `tn('mesfavoris.count', ...)` call site is gated `total > 0 ? tn(...) : undefined`
  (`mes-favoris/page.tsx:29`), and the live `favorites` table currently has 0 rows across every
  account. There is no way to reach a non-empty `/mes-favoris` today without writing a favorite —
  the empty state is all that's reachable.
- **Why deferred:** favoriting a product/service through the app UI (rather than a raw INSERT)
  would work and leaves no orphaned data, but doing it purely to screenshot a count pill wasn't
  worth the extra write for a check `plurals.test.ts`'s `mesfavoris.count` assertions already cover
  deterministically (same `one`/`two`/`other` shape as `mesannonces.count`, which IS
  screenshot-verified against 3 real accounts).
- **Trigger:** next time `/mes-favoris` is touched with real favorited data in hand, confirm
  "{count} favori" / "1 مفضّلة" render correctly at 1 in situ.

### `consumer.dashboard.orders.count` (`ActiveOrdersSnapshot`) has zero page importers — confirmed pre-existing, not caused by this PR

- **What:** while migrating `consumer.dashboard.orders.count_one`/`count_many` to `tn()`, a grep for
  `ActiveOrdersSnapshot` (the component that calls this key) turned up no importer anywhere in
  `src/app` — the component is real, tested (`ActiveOrdersSnapshot.test.ts`), and exports cleanly,
  but no page currently renders it. `/tableau-de-bord` (the obvious guess) is a `ComingSoon` stub for
  a `seller_type: null` account, and `ConsumerHomepage.tsx` doesn't import it either.
- **Why deferred:** this predates the PR — nothing in this diff removed an import — and wiring a
  dashboard section into a real page is a product decision outside a pluralization PR's scope.
- **Trigger:** whichever PR builds the real consumer dashboard route. Until then,
  `consumer.dashboard.orders.count`'s exact FR/AR wording is proven only by `plurals.test.ts`, not by
  a screenshot — there is no live route to screenshot.

## Paramètres part 2 — Confidentialité tab + role conditionality (`feat/parametres-tabs`, 2026-08-24)

### Adjacent Latin proper nouns in Arabic copy visually reorder under RTL — a new bidi class beside the numeric-run one

- **What:** new AR copy for the Confidentialité "Visibilité" section originally read `"...محركات
  البحث مثل Google وBing بفهرسة..."` — two short Latin brand names, each its own LTR run, separated
  only by the bidi-neutral prefix conjunction "و". The DOM `textContent` was correct Arabic; the
  **rendered screenshot** showed the two runs visually reorder into `"...مثل Bingg Google..."` — a
  garbled collision, not a translation error. Caught only because the row was screenshotted during
  verification; a DOM read or unit test would have reported the string as fine.
- **Why this is a distinct class from [[reference_rtl_numeric_run_reversal]] / the `tndPrice` entry
  above:** those are digit-run (EN) + Latin-letter-run (L) reversals under UAX#9 rules W7/N1/N2 — one
  number, one unit/currency token. This is **two separate strong-LTR (L) runs**, both proper nouns,
  with no digits involved — same family of bug (UAX#9 bidi reordering of embedded LTR content inside
  an RTL paragraph), different trigger condition (adjacency of two L runs, not an EN+L pair). Anyone
  pattern-matching "we already handle the digit case with `dir=\"ltr\"`" would miss this one — it
  isn't a number, so the existing numeric-run mitigations don't apply, and there's no single `dir`
  wrapper to reach for since both tokens sit inside one plain-string `t()` call (no sub-span to
  isolate without restructuring the row to accept rich content).
- **Fix applied (this PR):** reworded the two AR strings to drop the explicit engine names entirely
  (`"يسمح لمحركات البحث بفهرسة..."`) rather than fight the bidi algorithm — the brand names weren't
  essential information and isolation markup isn't reachable through a plain `t()` string.
- **Trigger / standing rule going forward:** **any new Arabic copy that names two or more Latin-
  script proper nouns (brand names, product names, acronyms) in the same sentence needs a real
  screenshot, not just a DOM/unit-test read, before it ships.** If isolation is ever needed instead
  of a reword (e.g. the names are unavoidable), the row will need to accept rich content so each
  Latin run can sit in its own `dir="ltr"`/`<bdi>` span — `t()` returning a plain string can't do
  that today.

### PR-3 (Notifications tab) — blocked on Figma monthly quota, prep notes for a clean start

- **What:** the Notifications tab's six `Setting Row` rows (E-mails panel: row 4 = "Alertes de
  sécurité" locked ON, rows 5–6 off, shop_owner variant drops "Missions correspondant à mes
  compétences" for "Alerte stock faible") were never built this PR. Session memory
  (`project_figma_i2_parametres`, `project_figma_aide_param_shop_support`) only ever recorded the
  **structure** — row count, which row is locked, which row differs by role — never the literal
  label/description text for rows 1, 2, 3, 5, 6. A repo-wide grep confirmed the copy isn't written
  down anywhere else either.
- **Why deferred:** the one `get_design_context` call this session's Figma quota allowed was spent
  measuring the Confidentialité base/shop_owner delta (`423:17277`, see the tab's own PR). A second
  call for the Notifications specimen (`424:17442`) hit `mcp_rate_limit_paywall` outright — the
  Starter-seat monthly cap was exhausted, not a transient failure (see
  [[reference_figma_mcp_monthly_quota]]'s 2026-08-24 entry: the session's entire remaining budget was
  exactly one call, not "plenty"). Per standing instruction, did not retry into the quota and did not
  guess the copy to fill the gap — `PlaceholderTab` stays wired for Notifications until this is
  unblocked.
- **Trigger / what to pull when quota resets:** primary target **`424:17442`** (the "état sauvegardé"
  Notifications specimen — has the full 6-row panel + section chrome). If that node is gone or
  insufficient, the same content also lives in the main I2 frame **`423:16615`**. The shop_owner
  variant's swap (drop "Missions...", add "Alerte stock faible") is **`558:38878`** — pull only if
  the base pull doesn't already carry enough to derive the swap from the structural delta memory
  already has recorded. One call should cover it (base rows only, deriving the shop delta from
  memory); budget a second only if the founder wants the shop_owner row's exact text verbatim rather
  than derived.

## Dependency audit PR-2 — Sentry SDK bump (`chore/deps-sentry`, 2026-08-24)

### 🔴 Zero successful deployments since 2026-06-05 — not a noisy red check, production is running a month-old manual deploy and every safety-net item merged since is undeployed. FOUNDER DECISION NEEDED.

- **What:** GitHub's own deployment-status API on the PR #158 merge commit (`45ff51a`,
  2026-08-24T16:33:37Z) returns a Vercel status of `failure` with the description **"Cannot deploy
  from a private GitHub organization repository on the Hobby plan"**
  (`target_url` points at `vercel.com/servyou-s-projects?upgradeToPro=github-private-org-to-hobby`).
  Confirmed via `gh api repos/Servyou-tn/servyou/commits/<sha>/status`. Per that same check, the
  **last successful git-triggered deployment of any kind is 2026-06-05T00:28:15Z** — this is a
  platform-level restriction, not a per-commit flake, so it applies to every merge since, not just
  the ones individually re-checked. This is a live restriction, still true today (verified again
  while writing this correction).
- **What production is actually running, precisely — corrected from an earlier "3-month-old build"
  guess in this same entry:** the Vercel MCP's `list_deployments` shows the *most recent deployment of
  any kind* (git-triggered or manual — its metadata doesn't reliably distinguish the two, which is why
  the check above uses GitHub's API instead) is `dpl_5GxbofHn4ZKrePA5Gk1NBR956UQx`, created
  **2026-07-23T11:14:16Z**, actor `claude-code_2-1-215_agent` — almost certainly a manual `vercel
  --prod`/CLI deploy run from a Claude Code session, matching [[project_vercel_deploy_pipeline]]'s
  existing note that CLI `--prod` works while CLI preview is blocked. That deploy shipped commit
  `db740bd` ("PR-DS-2 application shell"). Diffing `db740bd..origin/main` today: **72 merged PRs, 203
  commits** are live on `main` and NOT live in production — everything from PR #87 onward, including
  this PR's Sentry bump, the #157/#158 dependency work, and the entire Paramètres rebuild. So the
  honest framing is two separate facts, not one: the git-integration pipeline has been fully dead for
  ~2.5 months (since June 5), *and* the informal manual escape hatch hasn't been used in over a month
  either (since July 23) — nobody has manually deployed anything since.
- **Sentry, specifically — per the founder, zero events received in this window.** I have no Sentry
  dashboard/API access from this environment to verify that independently (no `SENTRY_AUTH_TOKEN` or
  DSN anywhere local — confirmed empty in `.env.local`/`.env`, only declared as empty placeholders in
  `.env.example`). But it's consistent with everything above regardless: since nothing newer than the
  July 23 manual deploy has ever gone live, no build containing this PR's SDK version — or any of the
  Sentry-adjacent work from the last month — has ever run in production. Whatever Sentry does or
  doesn't show right now, it isn't testing this bump.
- **Why this wasn't caught earlier:** nothing surfaces the failure anywhere a PR author would look —
  the GitHub PR UI doesn't block merge on it, and `docs/servyou-*` / CLAUDE.md's Definition-of-Done
  item 9 ("Vercel green") has apparently been unverifiable-but-uncaught this whole time. The site
  looking "current enough" off a stale manual deploy is exactly what let a fully broken pipeline go
  unnoticed for months.
- **Why this blocked PR-2's live verification:** the task asked for a real preview deploy + a thrown
  error confirmed in the Sentry dashboard. That's the only path to any live evidence at all, and it's
  closed at the platform level — not something a retry or a different push fixes.
- **🔴 FOUNDER DECISION REQUIRED — not fixed here, it's a plan/billing call, not a code change:**
  1. **Upgrade the Vercel team to Pro** (unblocks git-integration deploys), or
  2. **Make the GitHub repo public** (unblocks git-integration deploys AND — see the CI section below
     — unblocks GitHub branch protection, which is *also* Pro/public-only on this org and is why a
     failing CI has never once blocked a merge either).
  Every "ships before real users" safety-net item currently sitting on `main` — this Sentry bump
  included — is undeployed until one of these happens.
- **Trigger:** already fired, repeatedly. Every PR since #87 has merged into this state. Nothing
  further needs to happen to notice it again; it needs a decision.

### ✅ RESOLVED 2026-08-25 (was: 🔴) — CI's `Type-check · Lint · Test · Build` GitHub Action has been red for 9 straight PRs, #150→#158 (2026-08-19→2026-08-24) — genuine, pre-existing, unrelated to dependency work, and it has NEVER been able to block a merge on this repo

- **What, corrected — an earlier pass at this entry said "since #154"; walking every CI run instead of
  a sample shows it started earlier:** `gh run list --branch main --workflow CI` shows `failure` on
  **every merge from #150 through #158 inclusive** — 9 in a row, 2026-08-19 through 2026-08-24. Real
  ESLint errors, not flake, confirmed by pulling each run's actual log (`gh run view <id>
  --log-failed`), not just the pass/fail summary:
  - **#150** (2026-08-19, `feat/annonces-form-ds`) is where it *starts*: `tag-input.tsx` was promoted
    into `src/components/ui/` in that PR, bringing one `shared-ui/no-raw-color` violation
    (`h-[…]`, line 91) — `✖ 6 problems (1 error, 5 warnings)`.
  - **#150 through #155** all fail on that same single error.
  - **#156** (2026-08-23, `feat/parametres-shell`) adds three more of the same rule in the new
    `setting-row.tsx` (`min-h-[…]`/`w-[…]`/`size-[…]`, lines 72/133/151) — from here on it's
    `✖ 9 problems (4 errors, 5 warnings)`, exit code 1.
  - **#157, #158** carry the same 4 errors forward.
  - **Footnote so it isn't conflated with the above:** #148 (2026-08-18) also failed CI, but for
    unrelated `TS2307`/`TS2305` dangling-import errors from a rename in progress — self-fixed the same
    day by #149. A one-off, already resolved, not part of this streak. #144–#147, #149 were green.
  - Neither `chore/deps-lockfile-refresh` (#158) nor `chore/deps-sentry` (this PR) touches
    `setting-row.tsx` or `tag-input.tsx` — confirmed via `git log --follow` on both files.
- **Genuine violation, not the rule misfiring on a token reference:** all four flagged values are
  literal pixel literals (`min-h-[72px]`, `w-[122px]`, `size-[18px]`, `h-[18px]`) — none reference a
  `var(--token)`, so this isn't the rule failing to recognize a legitimate token utility. They're
  Figma-measured exact dimensions that don't land on Tailwind's default spacing scale either (72px/
  122px/18px are all off-scale — the default steps jump 16→20, skip 4.5, etc.), which is presumably
  *why* arbitrary-value syntax was reached for in the first place. The rule is doing exactly what
  `eslint-rules/boundary.mjs` says it's for.
- **Why CI catches it and nothing local does — it's not an environment mismatch, lint just isn't in
  anyone's local loop:** ran `npm run lint` directly against this branch — exit code 1, the identical
  errors CI reports. So the two environments agree; the gap is that **nothing runs that command except
  CI.** CLAUDE.md's Definition-of-Done only names `pnpm build`/`npm run build` as the local gate, never
  `npm run lint`. And a plain `npm run build` (also run against this branch, exit code 0, all 59 routes)
  confirms Next.js 16 no longer runs ESLint during build at all — `next-lint.js` doesn't exist in
  `node_modules/next/dist/cli/` any more, and the build's own step list is just Turbopack compile →
  `runAfterProductionCompile` → TypeScript → static generation, no lint step. Older Next versions ran
  lint automatically at build time as a safety net; this one doesn't, and nothing replaced it locally.
  `npm run lint` genuinely only runs in the CI job.
- **And CI failing has never once blocked a merge, structurally:** `gh api
  repos/Servyou-tn/servyou/branches/main/protection` returns `403` — *"Upgrade to GitHub Pro or make
  this repository public to enable this feature."* Required-status-check branch protection is
  unavailable on this org's current plan+visibility, so a required-CI gate has never existed to bypass
  — a red run was never going to stop anything, which is exactly how #150 through #158 all landed
  clean through review with CI quietly on fire underneath.
- **Not fixed here:** out of scope for a dependency-bump PR per CLAUDE.md's "one PR, one focus." Fix
  options (replace the raw px with a token/nearest scale step, or decide the rule needs a documented
  exception for measured-geometry cases) are a design-system-compliance call, reported to the founder,
  not applied.
- **Trigger:** the next PR that touches `setting-row.tsx` or `tag-input.tsx`, or a dedicated CI-green
  sweep — whichever comes first. Worth reading together with the Vercel finding above, not as two
  isolated items: **this repo currently has no automated signal that can stop bad code from reaching
  `main`, and no deploy pipeline that gets `main` in front of anyone anyway** — the founder's Vercel
  Pro/public-repo decision above would incidentally fix this one too, since branch protection has the
  same plan/visibility gate as the Vercel restriction does.
- **Closed by `chore/lint-raw-colors` (PR #160, 2026-08-25).** All 5 violations fixed — not 4:
  `tag-input.tsx:91`'s `h-[18px] w-[18px]` was two in one string; the linter's `checkString` only
  ever reported the first. None land on `tokens.css`'s named `--spacing-N`
  scale, but Tailwind v4's dynamic scale resolves any bare numeric multiplier through the same
  `--spacing` custom property the named tokens use (verified by compiling through the project's
  actual `@tailwindcss/postcss` pipeline) — so each became a bare multiplier
  (`min-h-18`/`w-30.5`/`size-4.5`/`h-4.5 w-4.5`) rather than a bracket literal, following the
  precedent `Header.tsx` already set with `h-18` for 72px. CLAUDE.md's DoD item 3 now names
  `npm run lint` explicitly alongside `tsc`/`build`, closing the second half of this entry (lint
  passing locally means nothing if nobody runs it) — the branch-protection gap above is still open
  and still the reason a red CI check couldn't have blocked #150→#158 even if lint had been run.
  See that PR's own follow-ups entry below for a related scope gap the investigation surfaced.

## Fix the four raw-color values + gate lint locally (`chore/lint-raw-colors`, 2026-08-25)

### `shared-ui/no-raw-color` only covers `src/components/ui/**` — raw bracket values already live outside that boundary, uncaught by design

- **What:** this PR fixed the rule's 5 known violations (`setting-row.tsx` ×3, `tag-input.tsx` ×2 —
  see the PR body for the value-by-value breakdown). While checking whether four other components
  shipped in the same window also failed lint (AnnonceCard, AnnonceDetail, ConfirmModal,
  ParametresShell), the honest answer turned out to be a scope finding, not a clean bill of health:
  `eslint.config.mjs` only applies `shared-ui/no-raw-color` to `files: ["src/components/ui/**/*.{ts,tsx}"]`.
  All four components live in `src/components/marche/` or `src/components/parametres/` — outside the
  glob — so none of them can fail this rule regardless of what they contain. Two of the four contain
  exactly the pattern the rule exists to catch: `AnnonceCard.tsx:182` has `rounded-[10px]`, and
  `ParametresShell.tsx:161,178` has `max-w-[720px]` (×2) — both already flagged as off-token in their
  own code comments (`rounded-[10px]`'s comment calls it "the same already-logged off-token CTA
  radius"; `max-w-[720px]`'s calls it "the same cap ... numbers the rail/content split above already
  uses"), i.e. known, not accidental, and still invisible to `npm run lint` either way.
- **Why this matters beyond these two files:** the rule's boundary was drawn at the shared/UI-
  primitives layer (F2's "primitives stay token-only" boundary,
  `eslint-rules/boundary.mjs`'s header comment), which is a reasonable place to enforce strictly
  first — but it means every raw arbitrary value in feature code (`src/components/marche/`,
  `src/components/parametres/`, `src/app/**`, etc.) is currently unenforceable by lint at all, not
  just unenforced-until-now the way `setting-row.tsx`/`tag-input.tsx` were. A grep for the same
  bracket-numeric pattern this rule matches turns up hits beyond just these two files; no full count
  was taken here — that's exactly the sweep this needs, not something to estimate from two examples.
- **Not fixed here — deliberately:** widening `shared-ui/no-raw-color`'s `files` glob (or adding a
  second, feature-scoped rule) is its own PR. It needs a repo-wide sweep first to know how many files
  it would newly flag and whether any are false positives (an intentional 1px hairline, a value that
  genuinely has no token equivalent) before the rule goes live — the exact caution this PR itself
  followed for `w-[122px]`/`size-[18px]` (checked for a token match before touching either, didn't
  invent one). Widening the glob without that sweep first would just repeat the #150→#158 pattern:
  a rule going red with nobody positioned to act on the count.
- **Trigger:** a dedicated PR to (1) sweep `src/components/marche/`, `src/components/parametres/`,
  and `src/app/**` for the same bracket pattern, (2) triage which hits are genuine token gaps vs.
  fixable, (3) widen the `shared-ui/no-raw-color` `files` glob (or introduce a parallel rule) to
  cover what the sweep confirms is safe to enforce.

## Pre-public security audit follow-ups (`chore/pre-public-scrub`, 2026-08-26)

### `admin_overview_stats`'s REVOKE-from-`public` didn't hold — `anon` can still execute it live, though `is_admin()` blocks anything happening

- **What:** `db/migrations/20260607134340_admin_overview_stats_rpc.sql` explicitly runs
  `revoke all on function public.admin_overview_stats() from public; grant execute ... to
  authenticated`, intending `anon` to lose EXECUTE entirely — a second layer on top of the
  function's own `is_admin()` gate (the migration's own comment calls it "defense in depth on top
  of the is_admin gate"). A live query against the project
  (`has_function_privilege('anon', <oid>, 'EXECUTE')`) shows `anon` **can still call it** today,
  along with the other `admin_*` SECURITY DEFINER RPCs, `log_admin_action`, `get_contact_phone`,
  and `is_admin` — all flagged by Supabase's advisor as `anon_security_definer_function_executable`.
- **Not exploitable today:** every one of those functions opens with
  `if not public.is_admin() then raise exception 'Forbidden: admin access required'`, confirmed by
  reading each body in `db/migrations/`. `is_admin()` reads `auth.uid()` internally, which is
  `NULL` for an anonymous caller, so `where id = auth.uid()` never matches and it returns `false`.
  An anon call to any `admin_*` RPC reaches the function and is rejected before touching data.
- **Why it's still worth fixing:** the revoke was meant to be a second, independent layer so a bug
  in `is_admin()` alone couldn't expose these endpoints to anonymous callers — right now
  `is_admin()` is the *only* layer, not a second one, because the revoke isn't holding. Likely
  cause: a later default-privilege reset (Supabase grants EXECUTE on new `public`-schema functions
  to `anon`/`authenticated` by default; nothing has reasserted the revoke since this migration ran).
- **Trigger:** a migration that reapplies `revoke execute on function public.admin_overview_stats()
  from public, anon;` (confirming `authenticated` keeps it, since real admins authenticate), plus a
  check of the other `admin_*` functions and `log_admin_action` for the same drift. `get_contact_phone`
  and `is_admin` are intentionally anon-callable (both self-gate correctly on a real relationship /
  return `false`) and don't need the same revoke — don't lump them into the fix by pattern-matching
  on the advisor list alone.

## Production sign-in outage — Supabase free-tier auto-pause (diagnosed 2026-09-01)

### Free-tier Supabase auto-pause on inactivity presents as "wrong password," with nothing logged anywhere obvious — the diagnostic path that actually worked

- **What:** production sign-in failed for every account with the generic
  `'signin.errors.invalidCredentials'` message ("E-mail ou mot de passe incorrect."). The Supabase
  project (`xggomcitqrkaylqezjjz`) had gone to `INACTIVE` (paused) — almost certainly the free-tier
  auto-pause after a period of no API activity, plausible given the ~2.5-month dead deploy pipeline
  documented above. A paused project is unreachable, and `SigninForm.tsx`'s `signInWithPassword`
  call maps *every* error it can receive — wrong password, unknown email, unconfirmed email, or a
  bare network failure — to that one identical message (see the next entry). Nothing about "the
  project is paused" surfaces anywhere a developer would naturally look first.
- **The diagnostic path that actually worked:** `signInWithPassword` runs entirely client-side in
  the browser (`SigninForm.tsx:60`) — it never touches a Vercel serverless function, so it is
  invisible to both Vercel's runtime logs and Sentry by design (the `if (error)` branch never calls
  `console.error` or any Sentry capture; see next entry). What *did* show the problem was
  `src/middleware.ts`, which runs server-side on every request and also calls Supabase — Vercel's
  `get_runtime_errors` showed a fresh cluster the moment the paused project was hit:
  `TypeError: fetch failed` with cause `Error: getaddrinfo ENOTFOUND xggomcitqrkaylqezjjz.supabase.co`
  (62 occurrences), `AuthRetryableFetchError: fetch failed` (10 occurrences), and middleware
  invocations killed after Vercel's 25s function limit trying to reach the paused project. The DNS
  failure was the first concrete signal in the whole investigation — everything before it (checking
  `NEXT_PUBLIC_SUPABASE_URL`, comparing env vars) was necessary elimination but came up clean,
  because none of it was the actual fault.
- **Why this matters going forward:** any silent, no-activity-triggered infrastructure state change
  (pause, key rotation, quota exhaustion) on a dependency the client talks to directly will produce
  this same blind spot — a generic user-facing error with no signal in the app's own observability,
  because the failing call never passes through server code. The fix isn't specific to Supabase's
  auto-pause; it's specific to *client-side-only* calls to any external service.
- **Trigger:** already fired. Logged so the next time production auth or any other client-direct
  external call fails mysteriously, "check whether the backing service itself is reachable, not just
  whether the app's config is correct" is the second thing tried, not the last.

### `SigninForm` collapses connectivity failures into the same anti-enumeration message as genuine auth failures

- **What:** `SigninForm.tsx:65-71` treats every error `signInWithPassword` can return as
  equivalent and shows one message (`'signin.errors.invalidCredentials'`). That's the correct,
  deliberate design for wrong-password, unknown-email, and unconfirmed-email — those three *must*
  stay indistinguishable from each other, or the form becomes an account-enumeration oracle.
- **Why a connectivity failure doesn't belong in that same bucket:** enumeration risk is about
  leaking whether a *given email* has an account. Whether Supabase itself is reachable has nothing
  to do with any specific email — telling every user "we can't reach our auth service right now" leaks
  no per-account information at all. Folding it into the same generic message doesn't protect
  anything; it just actively misleads every affected user into thinking their password is wrong
  during an outage, which sends them into the password-reset flow instead of "try again shortly" —
  the wrong remediation, at the exact moment volume to support/reset is worst.
- **Not fixed here:** logged, not fixed — this is a small, self-contained UX/error-handling change
  (distinguish a thrown/network-shaped failure from a returned `AuthApiError`, keep the three
  enumeration-sensitive cases merged, give connectivity failures their own message), not something
  to fold into an unrelated diagnosis session.
- **Trigger:** its own small PR. Suggested shape: Supabase JS distinguishes `AuthApiError` (has a
  `status` from the API — genuine auth rejection) from a thrown/network-level failure (no response
  at all) — branch on that distinction rather than introducing new state, and give the network case
  its own `t()` string (e.g. "Impossible de contacter le serveur, réessayez dans un instant.")
  instead of the credentials message.

## Pre-existing integration-test fixture collision — `buyer-cancellation-history.test.ts` / `order-delivery-fee-snapshot.test.ts` (found 2026-09-03)

- **What:** both files' `beforeAll` call a `make*WithProduct(sellerId)` helper multiple times
  (2–3 sellers) that hardcodes a single literal shop name (`'BCH Shop'`, `'DFee Shop'`) with no
  per-call uniqueness suffix. The second and third calls now fail with
  `duplicate key value violates unique constraint "shops_name_lower_key"`, so both suites'
  `beforeAll` throws and every `it()` in the file reports skipped rather than passing.
- **Reproduces independent of any other change:** confirmed by running
  `npx vitest run --config vitest.integration.config.ts src/__tests__/buyer-cancellation-history.test.ts src/__tests__/order-delivery-fee-snapshot.test.ts`
  in isolation, on `main`, with no other test files in the run.
- **Cause:** `shops_name_lower_key` (migration `20260811055734_shops_name_unique_and_asset_select`)
  added a case-insensitive unique index on `shops.name` after these two fixture files were written;
  neither was updated to give each of its multiple shop-per-seller fixtures a distinct name.
- **Not fixed here:** found while running the full `npm run test:integration` suite as part of the
  provenance-gate PR (`uploaded_objects` / `enforce_product_image_provenance`), which touches
  neither file nor the `shops` table. Out of this PR's scope per CLAUDE.md's one-PR-one-focus rule.
- **Trigger:** its own small PR — suffix each `make*WithProduct` call's shop name with the seller id
  or a short random id, matching how every other live-DB fixture in this codebase (e.g.
  `uploaded-objects-provenance-rls.test.ts`'s `Provenance Test Shop ${randomUUID().slice(0,8)}`)
  already avoids this class of collision.
- **Still red (seen again 2026-09-05, `feat/d4-public-profile`):** first seen during the H3 build,
  still failing on the same `shops_name_lower_key` duplicate across multiple sessions since — the
  tests are not cleaning up after themselves, so orphaned rows from past runs keep colliding with
  the next one. Two integration tests permanently red is noise that will mask a real failure.
  Needs a teardown fix in addition to the `make*WithProduct` naming fix above, plus a one-time
  cleanup of the orphaned rows already sitting in the DB. Not tied to any page PR.

## H4 — Tableau de bord freelance (`feat/h4-dashboard-freelancer`, 2026-09-03)

### `job_posts` RLS hides a non-open post's title from the freelancer who legitimately responded to it — Activité récente's proposal rows can render with no secondary line

- **What:** `job_responses`' RLS grants a freelancer read access to their own response rows
  (`freelancer_id = auth.uid()`), but the embedded `job_posts ( title )` join runs under
  `job_posts`' OWN policy: `status = 'open' OR consumer_id = auth.uid()`. A freelancer who
  responded to a post that the consumer has since marked `filled` or that has `expired` is
  neither the consumer nor looking at an `open` post, so the embed returns `title: null` even
  though the response is entirely legitimate and visible.
- **Where it surfaces:** `src/lib/marche/freelancer-dashboard.ts`'s `getFreelancerDashboard` —
  the `ActivityEvent` union types this as `{ kind: 'proposal'; title: string | null }`
  specifically because of this gap, and the Activité récente panel renders the row without its
  secondary line rather than a fake or empty-string title.
- **Not fixed here:** would need a new `job_posts` SELECT policy (e.g. "or the caller has a
  `job_responses` row for this post") — a schema/RLS change, and this PR is explicitly "no
  migration."
- **Trigger:** the first time a freelancer notices a proposal activity row with a blank second
  line for a mission they actually responded to — add the widening policy to `job_posts` (mirror
  the "post owner and responder read responses" shape already used on `job_responses` itself,
  20260603182702).

### Same-cycle precedent, closed decision, don't re-litigate: `job_post_skills` is publicly readable

- Related gap in the same table family, already logged above at line ~2785 ("`job_post_skills` is
  publicly readable — a direct query (not through `job_posts`) would leak skills off posts the
  caller can't read"). H4's Missions récentes match query goes `freelancer_skills` →
  `job_post_skills` → `job_posts`, filtering `job_posts` explicitly to `status = 'open' AND
  admin_hidden_at IS NULL` before ever showing a title, so it does not hit that leak — noted here
  only so the two `job_post_skills`-adjacent gaps aren't confused with each other later.

## Shared-shell content column is wider than every frame in the file above 1440px (found 2026-09-04, `feat/h4-dashboard-freelancer`)

- **What:** `AppShellClient.tsx`'s content wrapper is `mx-auto w-full max-w-7xl` — a hardcoded
  1280px reading-width cap with no basis in any Foundations token. It sits on top of, and is
  unrelated to, the shell's own arithmetic (1440 frame − 240 sidebar − 32×2 page margin = 1136).
  At exactly 1440px viewport the two are indistinguishable (`max-w-7xl` never binds, since
  1136 < 1280), which is why every per-component measurement pass on H4 looked correct. At any
  viewport above 1440, `max-w-7xl` does bind and the content column stretches up to 1280px — 144px
  wider than any frame in the file.
- **Where it surfaces:** every page in all four workspaces, since `AppShellClient` is the shared
  frame — not H4-specific. Confirmed by figma-cli CDP: G4 (shop-owner dashboard, `475:21134`) and
  Marketplace services (`611:45637`) both independently land on the same 1136 via the identical
  sidebar+margin formula; no Screens-page frame in the file is ever drawn wider than 1440
  (Components-page specimen catalogs and the Foundations overview canvas do exceed it, but those
  aren't viewport frames). Foundations' "Dashboard / App-Screen Spacing Standard" (`239:7902`)
  locks the 32px page margin as a contract "for every app screen (freelancer + all 4 workspaces)"
  but defines no content-width/container token — 1136 is arithmetic, not an authored constant.
- **Not fixed here:** confirmed platform-wide, not H4-scoped, so it doesn't belong in the H4 PR
  per the one-PR-one-focus rule. H4 ships as-is.
- **Trigger:** its own PR touching `AppShellClient.tsx`. Fix is likely removing the `max-w-7xl` cap
  and letting the sidebar+margin arithmetic resolve the width naturally (reproduces 1136 at 1440
  without hardcoding it), rather than swapping in `max-w-[1136px]`. Needs a visual pass across all
  four workspaces at both 1440 and 1920.

## Tailwind v4 silently drops utilities that reference an undefined token — passed tsc/lint/build while visibly broken (found 2026-09-04, `feat/h4-dashboard-freelancer`)

- **What:** the H4 Ecosystem widget's consumers chip used `bg-success-600`. `tokens.css` only
  defines `success-50/100/500/700` — no `-600` — so Tailwind v4 generated no CSS for that class at
  all (no build warning, no lint error). The chip rendered as No background whatsoever; only the
  white icon glyph was visible, reading as an unfilled outline rather than the solid `#16A34A`
  circle in spec. `npx tsc --noEmit`, `npm run lint`, and `npm run build` were all clean the entire
  time this was broken.
- **Fixed here:** swapped to `bg-success-500`, which resolves to `#16A34A` — the exact measured
  spec color already on record in `docs/design/h4-discovery.md` §9 — and is screenshot-verified
  solid.
- **Not fixed here — the general gap:** nothing in the standing DoD checklist (tsc/lint/test/build)
  catches a Tailwind utility that silently no-ops because its token doesn't exist. This is the same
  failure class as [[reference_tailwind_v4_theme_utility_gotcha]] (a missing `--color-*` alias
  renders nothing, build stays green) but from the opposite direction — here the primitive existed
  at one shade and the utility referenced an adjacent shade that didn't.
- **Trigger:** worth a lint rule or a cheap token-name assertion (e.g. a script that greps every
  `bg-`/`text-`/`border-{brand,success,warning,danger}-{shade}` utility used in `src/` against the
  shades actually defined in `tokens.css`, run in CI) if one is cheap to add. Until then, add "does
  every color utility in the diff resolve to a defined token" to the manual visual-gate checklist.

## `service_listings` has no honest "published" timestamp (found 2026-09-04, `fix/h4-dashboard-fidelity`)

- **What:** H4's Activité récente panel has a measured Figma kind, "Service «title» publié"
  (167:12333), that needs to know when a listing went live. `service_listings` only has
  `created_at` and `updated_at` — checked `information_schema.columns` directly. `created_at`
  fires at row creation regardless of status, so it conflates a listing created as a draft with
  one that's actually publicly visible; `updated_at` fires on any edit (price, description,
  delivery time — not specifically a status transition), so it's not a publish signal either.
  Checked for a status-history table too (`information_schema.tables` filtered on
  service/listing/audit-shaped names) — nothing exists but `admin_audit_log`, which is unrelated
  (admin actions, not listing lifecycle).
- **Not fixed here:** the founder ruled this kind waits rather than shipping on a timestamp that
  can lie in a notification feed ("Service published" showing for a listing that's still a
  draft). Not built in this PR — Activité récente ships with its other three measured kinds only.
- **Trigger:** a migration adding `service_listings.activated_at`, set from the same trigger that
  already maintains `freelancer_profiles.is_published` — that trigger already fires on the right
  transition (draft/inactive → active), so deriving `activated_at` from it is a small addition,
  not new lifecycle logic. Needed by this Activité récente event kind, and worth having generally
  for any future notification/email that wants to say "your listing is live" honestly.

## D4 — Profil freelance public (`feat/d4-public-profile`, 2026-09-05)

### `FreelancerShareButton` is now at its documented third consumer — promote to shared
- `src/components/produits/ShareLinkButton.tsx` (D1) and `src/app/boutique/[id]/_components/
  ShopShareButton.tsx` (D3) already share one plain copy-link pattern:
  `navigator.clipboard.writeText(window.location.href)`, a busy-state `Button`, and a success/error
  toast. `src/app/freelance/[id]/_components/FreelancerShareButton.tsx` (D4) is the third
  independent copy of that same pattern — same rule this file already used for `Stepper` above
  ("promote at third consumer").
- **Not promoted here.** Promoting means picking a shared location (`src/components/ui`, per the
  Stepper precedent) and repointing D1's and D3's existing imports at it — a cross-cutting edit to
  two already-shipped surfaces from inside a D4 PR, which "one PR, one focus" pushes back on. A
  page build (D4) is not the place to widen into that refactor.
- **Trigger:** a fourth consumer, or a dedicated component-consolidation pass.

## H5 — Mes services (`feat/h5-mes-services`, 2026-09-05)

### `StatTile` is now at its documented third consumer — promote to shared
- `tableau-de-bord-vendeur/_components/StatTile.tsx` (G4) and `tableau-de-bord/_components/
  StatTile.tsx` (H4) both already carry the "promote at the 3rd consumer" comment.
  `mes-services/_components/StatTile.tsx` (H5) is the third route-local copy — and it needed a
  `delta` region neither of the first two has (H5's "Commandes ce mois" tile is the first REAL
  delta value in the app; H4's own "Vues du profil" tile deliberately renders none).
- **Not promoted here.** Promoting means designing one shared shape covering all three tiles'
  measured deltas (G4: no delta, always a subtitle; H4: no delta, optional muted value; H5: an
  optional signed delta ALONGSIDE a caption) and repointing two already-shipped dashboards at it —
  out of an H5 page-build PR's scope, same reasoning `FreelancerShareButton` used above.
- **Trigger:** a fourth consumer, or a dedicated component-consolidation pass.

### `marche.sidebar.coming_soon`'s Arabic value is untranslated French — found while building H5
- `src/lib/i18n/ar.ts` line ~1382: `'marche.sidebar.coming_soon': "Bientôt disponible"` — the exact
  French string, not translated. H5 reuses this key for its two permanently-inert CTAs ("+ Créer un
  service" and the kebab's "Modifier", both disabled because H6/H7 don't exist in code yet), and
  the AR curl-verified render confirmed the leak lands on H5's own AR page, not just wherever this
  key was first used.
- **Not fixed here.** The key is shared across the sidebar, admin nav, and at least one other
  ParametresForm consumer (per its own comment) — retranslating it is a one-line fix but touches
  shared copy from inside an H5 PR, which is exactly the drive-by CLAUDE.md's one-PR-one-focus rule
  exists to stop, however small.
- **Trigger:** its own tiny PR — translate to something like "قريبًا" or "متاح قريبًا" and
  re-verify every consumer's AR render (sidebar, admin nav, ParametresForm, H5 now too).

### Service Row's category-specific thumb icon — real column, no icon data behind it (founder to rule)

- **Founder's own H5 fidelity pass (2026-09-06)** asked whether the row's per-category glyph (Figma
  258:7898's `thumb-icon`, swapped per service — palette/code/video/file-text/megaphone/languages)
  maps to a real column, and to report rather than invent a mapping if not.
- **What's real:** `service_listings.category_id` (migration `20260625000000`) is a genuine FK to
  `public.categories`. It is currently NOT selected in `seller-services-query.ts` — `SellerServiceRow`
  carries no category field at all, and `ServiceRow.tsx` renders a single hardcoded `Wrench` glyph
  for every row regardless of category.
- **Why it's not a simple wire-up:** `public.categories` (flat, 14 rows, migration `20260603182553`)
  has NO icon column — icons exist only in the separate `src/lib/taxonomy/service-categories.ts`
  (13 richer sectors: `developpement-web-mobile`, `design-graphique-logo`, …, each with a lucide
  `icon` name). The DB's flat service-kind slugs (`developpement`, `design-creation`, `marketing`, `montage-video`,
  `redaction`, `business-conseil`, `ugc`, `data-science-analyse` — from `20260804132447`'s backfill)
  do not line up 1:1 with the TS taxonomy's slugs, and reconciling them is the deferred taxonomy
  migration [[project_service_taxonomy]] already tracks, not this PR's scope.
- **Not fixed here** — per the founder's own instruction not to invent a mapping. Thumb stays the
  generic `Wrench` glyph for every row.
- **Trigger:** the taxonomy reconciliation migration lands (DB `categories.slug` aligned with
  `service-categories.ts` `id`) → then `seller-services-query.ts` can join `category_id` → slug →
  `serviceCategories.find(c => c.id === slug)?.icon` → a lucide icon-name→component lookup in
  `ServiceRow.tsx`.
- **✅ RESOLVED — `feat/h5-mes-services`, 2026-09-06.** Founder ruling: build it now against the 8
  real `categories.slug` values under `kind='service'` (`developpement`, `design-creation`,
  `marketing`, `montage-video`, `redaction`, `business-conseil`, `ugc`, `data-science-analyse` —
  confirmed live via `select slug, kind from categories`), independent of the taxonomy
  reconciliation above. `seller-services-query.ts` now joins `categories(slug)` and
  `SellerServiceRow.categorySlug` carries it through; `ServiceRow.tsx` holds a static
  `CATEGORY_ICONS` record (Code/Palette/Megaphone/Video/FileText/Briefcase/Camera/BarChart3),
  `Wrench` fallback for null/unmapped. The icon choices are founder-ruled, not measured against
  Figma — if the taxonomy migration above ever lands, re-derive from `service-categories.ts`'s own
  `icon` field instead of keeping this record as a second source of truth.

### Segmented control's selected-pill fill vs. H5's own frame — new sighting on the open consolidation question above

- Surfaced during the same H5 fidelity re-pass (2026-09-06) that produced the category-icon
  ruling above, and adds a fourth data point to the still-open **"`SegmentedControl`'s solid blue
  pill vs. the quiet frame — founder-ruled for F1, four implementations still unconsolidated"**
  entry a few sections up in this same file: the shipped
  `SegmentedControl` (`src/components/ui/segmented-control.tsx`) renders its selected tab as a
  solid `bg-brand-blue-600` pill with white label text; H5's own status-tabs frame (244:726)
  appears, from screenshot inspection, to show a white-pill-on-grey-track treatment instead — the
  same "quiet" look that entry already confirmed for F1's frame (`718:60584`, `surface-sunken`
  tokens) against this component's blue-fill default.
- **Unverified, not folded into that entry's evidence table yet** — both available Figma read
  paths (`get_design_context` and a `get_metadata` fill-inspection on the pill node) were
  exhausted before a clean fill-color read on 244:726 came back, and a
  screenshot-only comparison is exactly the kind of cross-zoom read this file has been burned by
  before (see the row-height sighting from this same fidelity pass — screenshot vs. Figma image at
  different zooms, no real divergence once DOM-measured). Do not treat this sighting as confirming
  244:726 is "quiet" — only that it looks that way, same evidentiary bar the existing entry already
  holds itself to for its two unchecked callers.
- **`SegmentedControl`'s actual current callers, re-counted against the live tree (grep +
  DOM-verified render, not memory) — the caller list in the existing entry is now stale in three
  places, so re-verify before scoping the consolidation PR:** only **two** call sites render
  today — `src/app/mes-services/_components/ServiceFiltersBar.tsx` (H5 status tabs, this PR) and
  `src/app/mes-produits/[id]/modifier/_components/EditProductForm.tsx` (product status toggle) —
  both DOM-confirmed live at 40px on 2026-09-06. The third importer,
  `src/components/dashboard/shell/SharedSearchBar.tsx`, is **unreachable**: it renders only under
  `DashboardTopBar` → `DashboardShellClient`, which this same file already documents as having
  zero render call sites anywhere in `src` (see "`DashboardSidebar.tsx` has a stale
  `/mes-missions` href — left alone, dead code"). `/marche/produits` and `/recherche` were gated
  for it and produced no `[role="tablist"]` at all. `FavorisTabs` (F1) no longer imports
  `SegmentedControl` per that entry's own fix, and the `ParametresForm` FR/AR toggle it names does
  not exist under that name in the current tree (`ParametresShell.tsx` carries no
  `SegmentedControl` import). Net: a fill change would repaint two live surfaces, not four.
- **Not fixed here** — same reasoning the existing entry already gives: one component's default
  fill is a design-system consolidation question, not a drive-by inside an H5 (or F1) page fix.
- **Trigger:** unchanged from the existing entry, now with a confirmed third frame (244:726) to
  pull alongside `718:60584`, `EditProductForm`'s and `SharedSearchBar`'s call sites — resolve all
  of it together in one design-system PR rather than another per-page patch.
- **✅ RESOLVED — `feat/h5-mes-services`, 2026-09-06.** The blocking condition above was a clean
  fill-color read on 244:726/244:727 and an accurate current caller count — this pass got both.
  `get_variable_defs`-equivalent read via the figma-cli plugin sandbox on `244:727` (the Segmented
  instance inside H5's own filter-bar) returned `surface/sunken` `#F1F5F9` track (`radius/lg` 10,
  padding 4), `surface/base` `#FFFFFF` selected pill (`radius/md` 8, `shadow 0 1 2 rgb(0 0 0/.04)`
  = `shadow-xs`), `text/primary` selected label, `text/secondary` unselected — the exact token pair
  already confirmed for F1's `718:60584` and `ProduitsLensToggle`'s `578:42513`, now a third
  independent frame agreeing on it with zero frames anywhere supporting the shipped blue fill. With
  the caller list re-audited down to the two real live consumers (`ServiceFiltersBar` and
  `EditProductForm` — `SharedSearchBar` unreachable, `ParametresForm`/`FavorisTabs` don't import
  it), "needs a design-system PR to weigh four implementations" no longer applied: there was
  nothing left to weigh, only two call sites to repaint to the pattern three frames independently
  agree on. `segmented-control.tsx` now ships `rounded-lg bg-surface-sunken` track /
  `rounded-md bg-white shadow-xs` selected pill / `text-text-primary` selected · `text-text-secondary`
  unselected, replacing the `rounded-full bg-surface-pill` / `bg-brand-blue-600` / `text-white` set.
  DOM-verified live on both callers (H5 desktop+mobile, FR+AR; `EditProductForm`'s status toggle),
  screenshot-checked via `scripts/gate/authed.mjs`-pattern CDP runs, 2026-09-07. The original
  entry's premise (four unconsolidated implementations) is now stale in the same way its own caller
  list was — closing both as resolved for the two implementations that actually exist.

## 13-sector service taxonomy reconciliation, PR 1 (`feat/taxonomy-13-sectors`, 2026-09-07)

### Skills pools for the 5 new service sectors — FOUNDER-UNREVIEWED, feed H6's type-ahead

- The 5 sectors added in the 13-sector reconciliation (`community-management`,
  `voix-off-doublage`, `personal-branding`, `coaching-meta-ads`, `coaching-ecommerce`) each carry
  a first-pass skills pool written by CC — not sourced from a measured Figma frame, the locked
  doc (which has no skills content at all), or prior art. Flagged `FOUNDER-UNREVIEWED` inline on
  each `skills:` array in `src/lib/taxonomy/service-categories.ts`.
- **Why it matters:** `skills` is the exact pool H6's type-ahead suggests from as a freelancer
  types — these strings render verbatim on screen. Skills are matched BY STRING (no skill
  entity/slug yet), so a wording change made after H6 ships would split one skill into two on
  the `/marche/services` filter instead of cleanly renaming it.
- **Founder's instruction (2026-09-07):** review these 5 pools when H6 "Créer un service" is
  actually built and the picker is on screen — not before, and not from reading the file in the
  abstract.
- **Not fixed here** — a starter list is exactly what was asked for at this stage; the point of
  this entry is only to make sure the review actually happens.
- **Trigger:** H6 reaches a reviewable state (wizard + skill-combo on screen).

### `coaching-ecommerce` sector id — hyphenation mismatch against the doc, left as-is (founder to rule)

- The reconciliation pass in this PR renamed 5 sector ids to match the locked doc's naming
  exactly (`dev-web-mobile` → `developpement-web-mobile`, `design-graphique` →
  `design-graphique-logo`, `traduction-langues` → `traduction`, `video-animation` →
  `montage-video-motion`, `conseil-assistance` → `consulting-assistanat`).
- **Not renamed:** `coaching-ecommerce`. The doc's heading is "Coaching e-commerce" (hyphenated);
  the file's own stated slug rule would derive `coaching-e-commerce`. Left alone because this is
  a hyphenation variant of the same name, not a naming mismatch like the five above, and it
  wasn't part of the founder's explicit rename instruction.
- **Trigger:** none set — this is a standing offer, not a deadline. Still free to rename now
  (nothing in `src/` imports this file yet); becomes a migration, not a diff, once PR 2 persists
  real `category_id` values against it.
