# Follow-ups — D3 shop page at 375 (`feat/m375-d3-boutique`, 2026-11-02)

## ~~Product card heart: 20 px tap target on mobile~~ — not a defect (corrected 2026-11-02)

The 20 px was the button's box, not its tap area: `FavoriteButton`'s `icon` variant carries an invisible `absolute -inset-3` span (since page 1),
so the tap area is 44 × 44 at every width. Hit-tested on C1 and D3 at 375 and 1440 (a point 21 px from the centre hits the heart on all four
sides). A card render test now pins it (`fix/product-card-ar-heart`).

## ~~Product card in Arabic: French titles cut at the start, price reads « TND 120 »~~ — fixed in `fix/product-card-ar-heart` (2026-11-02)

The title is `dir="auto"` and hugs the page's start side (`self-start max-w-full`), so a French title is cut at its end and short titles stay
on the right in AR; the price is an LTR-isolated `<bdi>` and reads « 120 TND ».

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
