# Pre-launch security batch PR-1 — shop-side read RLS (`fix/prelaunch-shop-read-rls`, 2026-10-25)

Found during migration 65's discovery (`docs/design/prelaunch-security-batch-discovery.md` §2 / §10). PR-2
(function EXECUTE, request-table INSERT columns, default-grant sweep) and PR-3 (`orders.received_at` +
cancel-metadata lock) are the same batch, not follow-ups.

## MEDIUM — the freelancer side has the gap migration 65 closed on the shop side (inferred, not live-tested)
✅ CLOSED — migration 75 (`20261027195820_moderated_freelancer_read_rls`), extended by 95. Live 2026-10-30: the
`freelancer_profiles` public branch requires `admin_hidden_at is null`, and the `service_listings` public branch
requires the parent profile's `admin_hidden_at is null`.

- **What:** `service_listings`' public branch (migration 52) is `status = 'active' and admin_hidden_at is null`
  with no `freelancer_profiles.admin_hidden_at` cascade, and "Freelancer profiles viewable by everyone" is
  `is_published = true OR owner OR admin`, where `is_published` is derived from active listings only. So
  `admin_hide_content('freelancer_profile')` — which stamps `admin_hidden_at` alone — appears to leave the
  profile, its seven child tables and its listings REST-readable while the app hides them in code. Inferred
  from the policy text and the RPC body; not exercised live.
- **Fix:** the products/shops shape from migration 65 — add the parent cascade to the `service_listings`
  public branch and `admin_hidden_at is null` to the `freelancer_profiles` public branch (the children already
  delegate through it). Live-test first: prove the read with a moderated fixture profile.

## LOW — moderated product images stay fetchable by URL (public buckets)

- `product-images`, `shop-assets`, `avatars` and `portfolio-media` are `public = true`. Migration 65 stops the
  REST API from handing out a moderated product's image URLs, but a URL already known keeps serving. Fix only
  if moderation must also take the file down: private bucket + signed URLs, or delete/move the object on hide.

## LOW — `shop_payment_methods.note` is readable by everyone who can read the shop (decision 6: leave)

- No app path selects `note` (only `method`), and 0 rows carry one. If it ever holds payment instructions
  meant for buyers only (a RIB, a D17 number), RLS cannot help — rows, not columns — so the fix is a
  column-level SELECT grant. Product call before anyone writes to it.

## LOW — the `shops` buyer branch is keyed on the seller, and one-shop-per-owner is app-only

- The branch matches `orders.seller_id = shops.owner_id`, never joining through `products` (that would
  recurse). The app keeps an owner to one shop (`resolveOwnedShopId`), but **nothing in the DB does**: the only
  unique index on `shops` is `lower(name)`, and `enforce_seller_capability` checks `seller_type` only. So an
  owner can INSERT a second shop through REST today, and anyone who bought from their live shop can then read
  that second shop — moderated or not — with its payment methods and categories (not its products, whose
  public branch needs an un-moderated shop and whose buyer branch needs an order on the product).
- **Fix (product call first):** if one shop per owner is a business rule, enforce it in the DB
  (`create unique index on public.shops (owner_id)`; 0 duplicates today), per CLAUDE.md's "every business
  rule enforced in the DB". If multi-shop is ever wanted instead, rework this branch.

## LOW — the shop-name pre-checks can no longer see moderated shops' names

- `ma-boutique/creer/actions.ts` and `ma-boutique/modifier/actions.ts` pre-check
  `.from('shops').select('id').ilike('name', …)` as the user. Since migration 65 a moderated shop is invisible
  to them, so a name it holds passes the pre-check and is caught by `shops_name_lower_key` at insert/update
  instead: the user still gets `name_taken` (the 23505 handler), but in the create flow `seller_type` has
  already been flipped to `shop_owner` with no shop — the same not-rolled-back state the file already
  accepts for concurrent submits. Rare (moderated names only). Fix if it matters: check uniqueness through
  a definer RPC, or roll `seller_type` back on 23505.
