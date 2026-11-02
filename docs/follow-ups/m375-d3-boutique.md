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

## Tablet band (640–1023 px): hero content at 16 px, the rest of the page at 32 px

**What** Below `lg` the full-bleed hero pads its content 16 px (the 375 frame). From `md` the shell's gutter is 32 px, so between 768 and 1023 px
the shop name, meta and chips start 16 px from the edge while « Produits » and the cards start at 32. D4's 375 hero (`FreelancerDetail.tsx`,
shipped in #289) has the same pattern. No frame covers this band.

**Why deferred** Changing it on D3 alone would make the two heroes diverge; it is one `md:max-lg:px-8` / `md:max-lg:start-8` on both, checked together.

**Where it lives** `src/app/boutique/[id]/_components/ShopDetail.tsx` and `src/app/freelance/[id]/_components/FreelancerDetail.tsx` (hero identity
block and avatar ring).

**Trigger** A tablet frame, or the founder's tablet pass.

## « Signaler cette boutique » wraps at 320 px

**What** At 320 px the actions row (heart · Partager · Signaler) does not wrap, so the Signaler label breaks onto two lines. This happened before
this PR too; its new 45 px touch target is sized for one line.

**Why deferred** Pre-existing, below the 375 frame; the fix (let the row wrap, or shorten the label on narrow screens) is a design call.

**Where it lives** `src/app/boutique/[id]/_components/ShopDetail.tsx` (actions row), `ShopReportModal.tsx` (trigger).

**Trigger** A 320 px pass.
