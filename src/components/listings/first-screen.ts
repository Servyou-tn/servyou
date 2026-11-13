// The FIRST-SCREEN rule for card grids (speed PR perf/first-screen). The cards a results grid shows before any scroll must paint
// with the page: their cover is not lazy-loaded and they do not wait for the entrance fade. Every card after them keeps both: the
// lazy cover and the BlurFade that plays as it scrolls into view.
//
// Why: the fade starts at opacity 0 in the server HTML and only runs once the client has hydrated, and Chrome does not count an
// invisible element as painted. On /marche/produits the first cover (the page's LCP) therefore painted just after hydration
// (~8 s on a 4× CPU / slow-4G phone), seconds after the rest of the page was on screen; its lazy `loading` delayed the request too.
//
// HOW MANY: the server cannot know the viewport, so the count is the widest row of the grid — 4 products (lg), 3 services (lg) —
// so a desktop row never shows some cards at once and the rest fading in. On the 2-up product grids that is also a phone's first
// screen (at 412 × 823 the second row starts at y ≈ 739, inside the viewport). On ONE-column phone layouts (services, the
// /categories listing look) it overshoots by a card or more: those cards just below the fold show without the fade, and their
// covers are requested with the page — which costs little, since Chrome's lazy-load margin (1250 px and more) fetched them at load
// anyway. Cards that mount at these indexes on a client-side filter / sort / page change also appear without the fade.
export const FIRST_SCREEN = { product: 4, service: 3 } as const

/** next/image loading props for the cover of the card at `index`: the first-screen covers load at once, the very first one at
 *  high fetch priority (the LCP candidate on a phone and on desktop alike); the rest keep next/image's default, `lazy`.
 *  `loading="eager"` + `fetchPriority`, not `preload`: Next 16's docs advise against a head preload when several images can be
 *  the LCP depending on the viewport, which is exactly a grid. */
export function coverLoading(index: number, firstScreen: number): { loading?: 'eager'; fetchPriority?: 'high' } {
  if (index >= firstScreen) return {}
  return index === 0 ? { loading: 'eager', fetchPriority: 'high' } : { loading: 'eager' }
}

/** BlurFade props for the card at `index`. A first-screen card renders straight in the fade's END state (`initial={false}`, no
 *  `inView`: with `inView` the first render resolves to the hidden state, so `initial={false}` would put it at opacity 0 in the
 *  HTML until hydration — the very wait this removes) — the same wrapper, the same final styles as a card that has faded in, only
 *  without the wait. The others keep the in-view fade. */
export function entrance(index: number, firstScreen: number): { initial: false } | { inView: true } {
  return index < firstScreen ? { initial: false } : { inView: true }
}
