# Speed PR — first screen (`perf/first-screen`, 2026-11-13)

## 1. LOW — local Lighthouse adds 2–4 s to a text LCP that the trace shows painting at first paint

- **What:** on this PC, Lighthouse's *simulated* LCP (the number in the report) is 3.5–6 s on home, `/marche/services`,
  `/freelance/[id]` and `/produits/[id]`, while its own trace has `observedLargestContentfulPaint` = `observedFirstContentfulPaint`
  on every one of those runs: the LCP element (hero h1, cookie-banner text, gallery photo) is in the first HTML and paints with it.
  - A real headless Chrome under the same conditions (412 × 823 @ 1.75, 4× CPU, 150 ms / 1.6 Mbps) confirms LCP = FCP on those pages.
  - Lighthouse's breakdown reports the gap as "render delay". It is a simulation artefact: the local server is slow (observed FCP
    1.1–2.9 s even unthrottled), so every script requested before that moment lands in the simulated LCP graph.
- **Why deferred:** measurement, not code.
- **Where it lives:** the local measurement setup.
- **Trigger:** any speed PR. Read `audits.metrics.details.items[0].observedLargestContentfulPaint` (or a real-browser probe) before
  calling a text LCP slow, and confirm on the Vercel preview or PageSpeed Insights.

## 2. LOW — this PC's DNS64 now answers EVERY lookup with NAT64 addresses, so `next start` refuses every Supabase image

- **What:** `xggomcitqrkaylqezjjz.supabase.co` resolves to `64:ff9b::…` (NAT64) next to its real IPv4 addresses on every lookup now
  (in speed PR-2 it was 1 run in 19). A production build keeps Next's SSRF guard, so 136 of 200 image URLs still answered 400
  after 8 tries each.
  - The guard counts each lookup's NAT64 answers as private addresses and refuses the image.
  - `dangerouslyAllowLocalIP` is on only in dev, by design (next.config.ts).
  - This PR measured with a preload outside the repo that drops the `64:ff9b::/96` answers from `dns/promises.lookup`
    (`NODE_OPTIONS=--require=dns-no-nat64.cjs`), applied to the before and after servers alike.
  - Before each server's runs, a script warmed the optimizer cache: every `/_next/image` URL of the measured pages returned 200
    once, with 0 failures.
- **Why deferred:** environment, not code.
- **Where it lives:** the local measurement setup. The script lives in the session scratchpad and is not committed.
- **Trigger:** the next local performance measurement. Either commit the preload and the warm script under `scripts/perf/` in a
  chore PR, or measure on the Vercel preview.

## 3. LOW — `/produits/[id]`: the gallery photo is preloaded but not at high priority

- **What:** the D1 gallery's main image uses `priority` (eager + head preload), but nothing sets `fetchPriority="high"`.
  - Lighthouse reports `priorityHinted: N`.
  - It is the page's LCP and already paints at first paint in the real-browser probe.
  - It was left alone because this PR's rule only touches an LCP element that is lazy or animated, and this one is neither.
  - Next 16 also deprecates `priority` in favour of `preload`; home's 3 hero photos use it too.
- **Why deferred:** outside the rule, and the gain is unmeasured.
- **Where it lives:** `src/components/produits/ProductGallery.tsx` (`priority={i === 0}`) and `src/components/landing/Hero.tsx`.
- **Trigger:** a slow D1 LCP on the preview or in production, or the Next 17 upgrade (when `priority` may go). Fix: add
  `fetchPriority="high"`, and rename `priority` to `preload` at the same time.

## 4. LOW — the favourites product grid keeps a lazy, fading first row

- **What:** `/mes-favoris` has two tabs.
  - The services tab goes through `ListingResults`, so it now follows the first-screen rule.
  - The products tab has its own grid, `FavorisProductGrid`, which still fades every card in and lazy-loads every cover.
- **Why deferred:** a private page, outside this PR's public-page scope.
- **Where it lives:** `src/app/mes-favoris/_components/FavorisProductGrid.tsx`.
- **Trigger:** the next favourites change. Spread `entrance(i, FIRST_SCREEN.product)` and `coverLoading(i, FIRST_SCREEN.product)`
  from `src/components/listings/first-screen.ts`, as the other grids do.
