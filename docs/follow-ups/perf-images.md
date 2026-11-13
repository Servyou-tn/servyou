# Speed PR-2 — images (`perf/images`, 2026-11-13)

## 1. MEDIUM — the LCP image is lazy-loaded on `/marche/produits` and `/boutique/[id]`, and the produits LCP waits on the card fade-in

- **What:** in the local Lighthouse traces (mobile, 412 × 1.75), the LCP element is an image that has no `priority`, so next/image renders it `loading="lazy"`.
  - **`/marche/produits`:** the LCP is the first card's cover (`ProductBrowseCard` → `ProductCoverImage`). LCP phases from a baseline run: TTFB 1.7 s · load delay 1.6 s · load 0.5 s · **render delay 4.8 s**. That render delay is the grid's `BlurFade` entrance: the card is `opacity: 0` until the client hydrates and the animation runs. LCP stays at about 8.5 s, whatever the image's size.
  - **`/boutique/[id]`:** the LCP is the shop banner (`ShopDetail`, `sizes="(max-width: 1279px) 100vw, 1120px"`), lazy, with a 2.3 s load delay.
- **Why deferred:** this PR changes image widths, `sizes` and file bytes only. Making the first row eager and preloaded, or letting the first cards skip the fade, changes loading behaviour and the card-entrance motion (founder pick 5: motion stays). That deserves its own measured PR.
- **Where it lives:** `src/app/marche/produits/_components/ProductBrowseGrid.tsx` (`BlurFade` per card), `src/components/produits/ProductCoverImage.tsx`, and `src/app/boutique/[id]/_components/ShopDetail.tsx` (the banner `<Image>`).
- **Trigger:** the next speed PR that targets LCP on the listing pages. Candidates:
  - `priority` (or `loading="eager"` + `fetchPriority="high"`) on the first 2 covers and on the banner;
  - no `BlurFade` delay on the first row. Re-measure LCP on the Vercel preview, not locally (see 4).

## 2. LOW — on narrow DPR-2 phones (375 / 360 wide), square product photos now get 384 px for a slot that is about 552 px

- **What:** the product card cover is a fixed `h-[276px]` box with `object-cover`, so a photo's rendered width depends on its shape, not on the column width.
  - At 375 × 2, a 2-up card is about 158 CSS px wide, and `sizes` says `50vw`, so the browser now takes the 384 width (it took 640 before).
  - A 3:4 photo renders about 207 px wide, so it needs 414 device px and gets 384 (93%).
  - A square photo renders 276 px wide, so it needs 552 and gets 384 (70%).
  - 6 of the 16 live covers are about square.
  - 384 is taken only where half the screen width × DPR ≤ 384. 390 × 2, 412 × 2 and DPR-3 phones are unchanged (640 before and after). Lighthouse's 412 × 1.75 takes 384: 3:4 needs 362, square 483.
- **Why deferred:** founder pick 3 is exactly this trade (the 384 width for the phone grids). The zoomed 375 × 2 crops in PR #368 show what it looks like.
- **Where it lives:** the `sizes` strings in `ProductBrowseGrid.tsx`, `ListingResults.tsx` (browse look) and `ShopDetail.tsx`.
- **Trigger:** if square covers look soft on a real 375 × 2 phone, set those three to `(max-width: 639px) 276px, (max-width: 1023px) 50vw, 25vw`. That makes those phones fetch 640 again: square covers become sharp, and the phone saving on those grids is gone. Lighthouse would keep 640 too.

## 3. LOW — at a zoomed, fractional viewport just under `sm` / `lg`, a card asks for the next column's width

- **What:** the card `sizes` strings now break at `max-width: 639px` and `1023px`, while Tailwind's `sm` and `lg` switch at 640 and 1024.
  - With browser zoom the viewport can be fractional, e.g. 639.4 or 1023.6 CSS px. Inside that sub-pixel window the grid still has the narrower breakpoint's columns, but `sizes` already uses its next term.
  - Example: a single-column 607 px slot is described as 50vw (~320 px), so it can fetch an image up to ~2x too small.
  - The old `640px` / `1024px` values failed the other way, by over-fetching at exactly those widths. Found by the PR #368 review.
- **Why deferred:** the window is under 1 CSS px wide, and only reachable with browser zoom. The integer edges are now right.
- **Where it lives:** the `sizes` in `ProductBrowseCard.tsx` (`DEFAULT_SIZES`), `ProductBrowseGrid.tsx`, `ListingResults.tsx`, `ShopDetail.tsx`, `ProductDetail.tsx`, `ProductListingCard.tsx` and `FreelancerDetail.tsx`.
- **Trigger:** if a soft card image is ever reported at a zoomed desktop width. Fix it with `(max-width: 639.98px)` / `(max-width: 1023.98px)`, or with range syntax `(width < 640px)` / `(width < 1024px)`.

## 4. LOW — local Lighthouse on this PC: still a NAT64 hit, and TBT is still noisy

- **What:** the same two problems as `perf-client-weight.md` item 2.
  - **NAT64:** one of the 19 baseline runs (`/produits/[id]` run 1) got `hostname resolved to private IP` → 400 on its product images. Its LCP fell back to the cookie banner text, so it was dropped and re-run. The 18 after runs had none.
  - **TBT:** still ranges about 1.0 to 3.3 s on one build.
- **Why deferred:** environment, not code.
- **Where it lives:** the local measurement setup.
- **Trigger:** any later speed PR. Check `/_next/image` statuses before trusting a run, and read image bytes (deterministic) before LCP and score (noisy).
