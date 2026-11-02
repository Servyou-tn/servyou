# Follow-ups — D3 shop page at 375 (`feat/m375-d3-boutique`, 2026-11-02)

## Product card heart: 20 px tap target on mobile

**What** The heart on `ProductBrowseCard` draws a 32 px circle but its button measures 20 px tall at 375 (D3, and every page that uses the card:
C1, D1's related rail, favourites). The project rule is ≥ 44 px on mobile.

**Why deferred** Shared card across already-shipped pages; enlarging the hit area is its own change, checked on every consumer.

**Where it lives** `src/components/produits/ProductBrowseCard.tsx` (the heart wrapper at `absolute start-2 top-2`).

**Trigger** The next pass on the product card, or the mobile accessibility sweep.

## Product card in Arabic: French titles cut at the start, price reads « TND 120 »

**What** In AR, a Latin-script title truncates from its start (« …naturel cousu main ») because the ellipsis follows the RTL direction, and the
price run « 120 TND » displays as « TND 120 ». Seen on D3 at 375 with French product titles; the same card is on C1 and D1.

**Why deferred** Shared card; the fix (`dir="auto"` / `<bdi>` on the title, an LTR-isolated price) needs a ruling on how AR prices should read
and a check on every consumer.

**Where it lives** `src/components/produits/ProductBrowseCard.tsx` (title and price lines).

**Trigger** The AR review pass, or a founder ruling on AR price formatting.
