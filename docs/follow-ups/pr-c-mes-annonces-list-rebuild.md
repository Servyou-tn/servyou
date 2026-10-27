# PR-C — Mes annonces list rebuild (`feat/annonces-list-ds`, 2026-08-22)

## ✅ CLOSED — `job_post_skills` is publicly readable — a direct query (not through `job_posts`) would leak skills off posts the caller can't read

- **Closed by** migration 65 (`20261025213214_prelaunch_shop_read_rls`, pre-launch security batch PR-1,
  2026-10-25): "Post skills readable with their post" delegates to `job_posts`' SELECT policies.

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

## `tndAmount()` has no thousands separator — confirmed unsafe to fix inside this PR alone

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

## `card-premium` vs `ServiceListingCard`'s 2px-outline treatment — two competing "premium card" looks, unreconciled

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

## `WhatsAppContactButton`'s `size="sm"` renders at 36px — under the project's 44px touch-target rule, now on three surfaces (PR-E, `feat/annonces-detail-ds`, 2026-08-22)

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

## `DeleteProductModal` has no focus trap, no Escape-to-close, no scroll-lock — the a11y wiring `ConfirmModal` now has and it doesn't (PR-E, `feat/annonces-detail-ds`, 2026-08-22)

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
