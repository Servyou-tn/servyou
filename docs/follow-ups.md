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
- **Where it should come from:** `shops.preferred_carriers` **exists** (text, nullable, unused) as a
  shop-level default. **G3 « Modifier ma boutique » is the surface that should feed it** — the shop
  owner picks their carriers once, and the order form defaults from that. That makes the per-order
  value a *selection from a known set* rather than free text, which is what a Select needs and what a
  future bordereau can join on.
- **Decide before building:** `preferred_carriers` is a free-text column today. If carriers become a
  selectable set it wants either a CHECK'd enum or a small lookup table — the discovery report
  explicitly deferred a `carriers` table as a Phase 3 question. Do not add the G9 Select before that
  is answered, or the two will disagree.
- **Trigger:** the G3 shop-edit build, or the delivery-documents PR (whichever lands first — the
  bordereau needs a carrier per order, so it forces the question).

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
- **Full inventory (scanned across every `cn()` site in `src/`): 4.** Two were closed in
  `feat/orders-snapshot-wiring` because they were visible and one of them was a named G9 delta:
  | site | loses | state |
  |---|---|---|
  | `components/orders/OrderRail.tsx` label | `text-caption` (12→16) | ✅ **closed** — plain template |
  | `tableau-de-bord-vendeur/_components/Panel.tsx` link | `text-body-sm` (14→16) | ✅ **closed** — plain template |
  | `app/commandes-recues/page.tsx` tab | `text-body` | ⚠ **open — latent**, inherited size is also 16 so nothing renders wrong *today* |
  | `app/commandes-recues/_components/SortSelect.tsx` | `text-body` | ⚠ **open — latent**, same |
  The two open ones are **landmines, not defects**: they are invisible only because 16px happens to
  be the inherited size. Any future change to the ancestor's size makes them wrong silently.
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
- **"Mes annonces" → /mes-missions vocab drift.** The sidebar item added per Figma `611:45637`
  is labelled "Mes annonces" but routes to `/mes-missions` (the job-posting list). Reconcile the
  vocabulary (annonces vs missions) in a naming pass; not renamed in the shell PR to avoid moving
  a live route. Lives in `sidebar-items.ts`.
- **/statistiques is now nav-orphaned.** "Statistiques" was removed from the shell sidebar (absent
  from the Figma). The `/statistiques` page still exists and builds, but the shell was its only nav
  entry — it's now URL-only until it gets its own IA decision (a freelancer-stats surface). Don't
  delete the route without that decision.

### Scope-A deferrals from the services rebuild (UI parity, no data)
- **Freelances lens:** the Services/Freelances toggle renders with Freelances **disabled ("bientôt")** — the Freelances view + its data layer + cards + `/freelance` pages don't exist yet. Trigger: the freelancer-world build.
- **Grid/list view toggle:** the Figma filter bar has a grid/list display toggle; the rebuild ships **grid only**. Trigger: if a list density is wanted post-launch.
- **AR Phase 8 residue:** `listing.service.{relativeAdded,deliveryTime,by}` (unused by this page) and the broader `/recherche` + `marche.*` French placeholders remain — this PR localized only the keys `/marche/services` renders. Trigger: the Phase 8 AR pass.

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
- **Topbar avatar cluster** — `flex shrink-0 items-center gap-4`, rightmost edge **431**.

This is **not covered by** the frontend audit's "380px 0-overflow (negative-control validated)" finding — a different viewport, and more to the point that sweep could not reach the 12 auth-walled routes. Both offenders here exist *only when authenticated* (the rail's 7 product stages, the topbar's name+role avatar cluster), so an anonymous sweep could not have seen either. Treat the audit's overflow result as covering anonymous routes only.

Not fixed in the breakdown PR: the rail is a previous PR's element and the fix is a real responsive decision (horizontal scroll vs a condensed mobile rail vs wrapping), not a one-liner.

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

### 🔴 `tableau-de-bord-vendeur:83` — "Voir ma boutique" is a live 404 a seller can press today

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
- **Trigger:** the D3 PR closes this. Until then, treat any "my shop page is broken" report as this
  entry, not as a new bug.

### 🟡 D3 assumes `shops.slug`; the column does not exist and every live link uses `shop.id`

- **Decide this ONCE, before D3 is built — it is the same id-vs-slug decision D4 already faced.**
  Deciding it twice is how two public URL shapes ship.
- The registry lists D3 as **Boutique publique — 1440 = `540:32918`**, and the design is recorded
  against `/boutique/[slug]`. The database disagrees. Live `public.shops` columns:
  ```
  id, owner_id, name, description, city, logo_url, banner_url, created_at, updated_at,
  shop_type, delivery_setup, working_hours, location_detail, preferred_carriers,
  admin_hidden_at, admin_hidden_reason
  ```
  **There is no `slug`.** Every call site in the app already builds `/boutique/${shop.id}` (see the
  entry above), so the id shape is the one that exists in code today and `[slug]` exists only in the
  design.
- **The two options, with what each actually costs:**
  - **`[id]`** — zero migration, matches all three existing links, ships D3 immediately. Cost: uuids
    in public URLs — unguessable, but unreadable and not shareable by name.
  - **`[slug]`** — needs a migration (nullable `slug`, unique index, backfill from `name`, a
    collision strategy, and a decision about whether renames break old links) plus updating all
    three call sites.
- ⚑ **Whoever builds D3 owns this decision, and should check what D4 chose for
  `/freelance/[slug]` first** — the two public profile routes should not disagree on URL shape for
  no reason. If D4 shipped slugs against a real column, D3 matching it is cheap; if D4 has the same
  gap, decide both in one migration rather than one page at a time.

### Boutiques lens — DEFERRED with a "Bientôt" badge, and why the Freelances precedent did not decide it

- **The frame is real and buildable.** `C1 — vue Boutiques = 578:42528` (browseHead `578:42529`,
  gridWrap `578:42532`), and the card exists as a component:
  **`Shop Card = 578:42367` — 4 variants · `state[default,hover]` `banner[true,false]` ·
  props: `shopName(text) city(text) productCount(text)`.** All three props map to real columns
  (`shops.name`, `shops.city`, and a count over `products`). This is NOT deferred for missing data.
- ⚑ **It is deferred because the card has nowhere to link.** Every Shop Card CTA resolves to
  `/boutique/{id}`, which 404s — see the 🔴 entry above. A grid of shops linking into hard 404s is
  worse than a disabled toggle: it looks finished and fails on click.
- **The Freelances precedent (`ServicesLensToggle`) was checked and does NOT transfer.** Freelances
  was deferred because its data layer, its cards, and the `/freelance` pages all did not exist.
  Here the data exists and the card exists; only the destination is missing. Same outcome, different
  reason — do not cite "we deferred Freelances too" as the justification when revisiting.
- **What ships instead:** the `Produits` segment active, `Boutiques` rendered `disabled` +
  `aria-disabled` with a visible "Bientôt" badge. That is a **deliberate divergence from
  `578:42513`, which draws both segments enabled** — marked in-code so a later fidelity pass can
  tell it from drift.
- **Data reality at deferral time** (1 shop total): 1 visible, 1 with active products, 1 with a
  city, **0 with a logo**. So the lens would have rendered a one-card grid, and the Shop Card's
  logo slot has no data on any row — it would fall back to initials, as the Product Card's shop
  badge already does.
- **Trigger:** ship this the moment D3 lands. The blocker is the destination, nothing else. Order is
  D3 → Boutiques lens, never the reverse.

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

### `aria-label="Fil d'Ariane"` is hardcoded French on both detail pages

- **What:** the breadcrumb `<nav>` on `ProductDetail.tsx` and `ServiceDetail.tsx:142` both carry a
  literal French accessible name, so an Arabic screen-reader user hears "Fil d'Ariane".
- **Why deferred:** D1 copied D2's existing markup deliberately — matching the precedent was the
  right call for a rebuild, and diverging on one page would leave the two detail pages announcing
  their breadcrumbs differently. It is two surfaces and one new i18n key.
- **Trigger:** fix both together with a `common.breadcrumb.label` key. Cheap; just not a D1 change.
