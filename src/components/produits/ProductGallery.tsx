'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ProductCoverImage } from '@/app/marche/produits/_components/ProductCoverImage'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// D1's gallery — Figma `Image Gallery 562:39182`, measured (docs/design/d1-discovery.md §2c).
//
// Desktop geometry, all measured: main 600×600 · every overlay at inset 12 · arrows 40×40 centred
// on the main image (frame has them at y=280, +20 = 300 = 600/2) · thumb strip 368×64 at gap 12,
// five 64×64, START-ALIGNED — it deliberately does NOT span the 600 column (5×64 + 4×12 = 368 ✓).
//
// ⚑ THE FRAME'S fav-circle IS 44×40 HOLDING A 44×44 HEART AT y=−2. That is an authoring slip, not a
// spec — the child overflows its parent 2px top and bottom. Founder ruled: build it 44×44 at inset
// 12, which is also what the other three overlays use (the frame has this one at end-inset 8).
//
// 🟡 EVERY RESPONSIVE VALUE BELOW IS INFERRED. There is NO 375 frame for D1 — the Screens page
// carries the 1440 frame and four desktop specimens only. The mobile ramp here follows D2's pattern
// by decision, not by measurement: single column below lg, main to full-width aspect-square, strip
// horizontally scrollable. Logged in docs/follow-ups.md beside C1's identical gap.

export function ProductGallery({
  images,
  title,
  productId,
}: {
  images: { url: string }[]
  title: string
  productId: string
}) {
  const lang = useLang()
  const [active, setActive] = useState(0)
  const many = images.length > 1

  // ⚑ ALL IMAGES ARE MOUNTED AT ONCE AND SWITCHING TOGGLES OPACITY — it does NOT swap `src`.
  //
  // This is the whole reason the markup looks redundant. A single <Image> whose `src` changes on
  // click tears the old element down and mounts a new one: next/image re-runs the optimizer round
  // trip, the box flashes empty mid-swap, and on a cold cache every thumb click is a fresh network
  // fetch of a 600px image. Stacking them means the five requests happen once, in parallel, on
  // first paint — and every click after that is a CSS opacity change with nothing to fetch.
  //
  // The cost is five decoded images in memory instead of one, which for a five-image product
  // gallery is the right side of the trade.
  const stack = (
    <>
      {images.map((img, i) => (
        <div
          key={img.url}
          // aria-hidden on the inactive layers, so a screen reader is not walked through five
          // copies of the same product. The visible one carries the alt text.
          aria-hidden={i !== active}
          className={`absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none ${
            i === active ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ProductCoverImage
            src={img.url}
            alt={title}
            // 600 at xl+, full viewport below it — matches the layout ramp in the parent (moved
            // with the grid breakpoint in ProductDetail.tsx:110; a stale 1023px split here would
            // tell next/image the box is 600px wide across the whole 1024–1279 stacked-full-width
            // band, and it would fetch an undersized source for the one element on this page whose
            // whole job is showing the photo clearly).
            sizes="(max-width: 1279px) 100vw, 600px"
            // Only the first is the LCP candidate; the rest ride the normal lazy path but are in
            // the viewport anyway, so they resolve well before a user reaches for a thumb.
            priority={i === 0}
          />
        </div>
      ))}
    </>
  )

  const overlayBtn =
    `absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full ` +
    `border border-border-subtle bg-white/90 text-text-secondary transition-colors hover:bg-white ${FOCUS_RING}`

  return (
    <div className="flex flex-col gap-3">
      {/* main — square, fluid at every width, capped at the 600 measured at 1440.
          ⚑ NOT `lg:h-[600px] lg:w-[600px]`. The parent grid column is `minmax(0,600px)` (see
          ProductDetail.tsx:110's note), so it shrinks below 600 whenever the shell can't fit it. A
          fixed 600×600 box ignores that and overflows its OWN column by the same margin the grid
          used to overflow the shell; it would just relocate the bug, not fix it.
          🔴 THE CAP IS `xl:`, MATCHING THE GRID'S BREAKPOINT — NOT `lg:`. The two must move
          together: below `xl` the parent is a plain flex column (no grid, no shared row with
          infoCol), so the gallery is meant to be genuinely full-width there, the same as at 375. An
          `lg:max-w-[600px]` left behind after the grid moved to `xl:` would silently cap the
          stacked-mode gallery at 600 for the whole 1024–1279 band, for no reason — that width isn't
          shared with anything in that mode. `aspect-square` + `w-full` + `xl:max-w-[600px]` tracks
          the column's real rendered width once the grid engages, and never exceeds the measured
          600. */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-sunken xl:max-w-[600px]">
        {images.length > 0 ? (
          stack
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-muted">
            <ImageIcon className="h-14 w-14" aria-hidden="true" />
            <span className="text-body-sm">{t('product.detail.no_images', lang)}</span>
          </div>
        )}

        {/* Favourite — inset 12, top-END. Rendered outside the image stack so it is never covered
            by a layer, and it is a sibling of nothing clickable, so it cannot navigate. */}
        <div className="absolute end-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-white">
          <FavoriteButton item_type="product" item_id={productId} />
        </div>

        {many && (
          <>
            {/* Counter — inset 12 bottom-START, and the ONLY overlay that is not a control.
                ⚑ `dir="ltr"` IS LORE-BEARING, NOT DECORATION. The string is `{current} / {total}`
                = `1 SPACE / SPACE 5`. The digits are European Numbers but the SPACES around the
                slash are neutral, so on an RTL page they resolve to the paragraph direction and
                split "1" and "5" into two separate LTR runs — which the RTL line then lays out
                right-to-left, rendering « 1 / 5 » as « 5 / 1 ». Caught in the AR browser pass; it
                read "image 5 of 1". A counter is a formula, not prose: it is LTR in both
                languages. `dir` also brings `unicode-bidi: isolate` from the UA stylesheet, so the
                run cannot leak into its neighbours — the same reasoning as the `<bdi>` in
                ImageUploadGrid.tsx:358. The BADGE still mirrors, because `start-3` is untouched. */}
            <span
              dir="ltr"
              className="absolute bottom-3 start-3 z-10 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium tabular-nums text-white"
            >
              {t('product.detail.gallery_counter', lang, {
                current: String(active + 1),
                total: String(images.length),
              })}
            </span>

            {/* Arrows wrap around both ends rather than disabling at the extremes: with five images
                and a counter always visible, wrapping is the cheaper interaction and never presents
                a dead control. `rtl:rotate-180` on the glyph only — the BUTTON stays at its logical
                inset, so start/end already mirror correctly. */}
            <button
              type="button"
              onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
              aria-label={t('product.detail.gallery_prev', lang)}
              className={`${overlayBtn} start-3`}
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setActive((i) => (i + 1) % images.length)}
              aria-label={t('product.detail.gallery_next', lang)}
              className={`${overlayBtn} end-3`}
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Thumb strip — 64² at gap 12, start-aligned. `shrink-0` is what keeps them 64 wide rather
          than letting flex compress them to fill 600; `overflow-x-auto` is the INFERRED mobile
          behaviour (no 375 frame), and is inert at lg where 368 < 600 so nothing ever scrolls. */}
      {many && (
        <ul className="flex gap-3 overflow-x-auto pb-1 lg:pb-0">
          {images.map((img, i) => (
            <li key={img.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                // aria-current is the honest role here: these select which image is shown, they are
                // not navigation and not a tablist (there are no tab panels to own).
                aria-current={i === active}
                aria-label={t('product.detail.gallery_thumb', lang, {
                  n: String(i + 1),
                  total: String(images.length),
                })}
                className={`relative block h-16 w-16 overflow-hidden rounded-lg bg-surface-sunken ${FOCUS_RING} ${
                  i === active ? 'border-2 border-brand-blue-600' : 'border border-border-subtle'
                }`}
              >
                <ProductCoverImage src={img.url} alt="" sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
