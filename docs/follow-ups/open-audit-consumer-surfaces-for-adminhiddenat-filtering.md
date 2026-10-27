# Audit consumer surfaces for `admin_hidden_at` filtering
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
