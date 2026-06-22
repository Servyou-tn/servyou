// Pure page-window builder for the numbered pagination. Returns the sequence of items to
// render between the prev/next arrows: page numbers interleaved with 'ellipsis' gaps. Kept
// render-free and framework-free so it is unit-tested directly (see pagination-range.test.ts).
//
// Always shows page 1, the last page, the current page, and `neighbors` pages on each side of
// the current page; near an edge the window extends so a consistent run shows (e.g. [1,2,3,…,N]
// at the start) instead of collapsing to "1 … current". A gap of exactly one page renders that
// page rather than an ellipsis — an ellipsis never hides a single page. The desktop row uses
// neighbors=1; the mobile row uses neighbors=0 (just first / current / last) so it fits 375px.

export type PageItem = number | 'ellipsis'

export function paginationRange(current: number, total: number, neighbors = 1): PageItem[] {
  // Callers render nothing for total <= 1; clamp defensively regardless.
  const last = Math.max(1, total)
  const page = Math.min(Math.max(1, current), last)

  const shown = new Set<number>([1, last, page])
  for (let d = 1; d <= neighbors; d++) {
    shown.add(page - d)
    shown.add(page + d)
  }

  // Edge fill: anchor a run of (2*neighbors + 1) pages at a touched edge so the window keeps a
  // steady width at the extremes (matches the [1,2,3,…] / […,N-2,N-1,N] convention).
  const run = 2 * neighbors + 1
  if (page <= neighbors + 2) for (let p = 1; p <= run; p++) shown.add(p)
  if (page >= last - neighbors - 1) for (let p = last - run + 1; p <= last; p++) shown.add(p)

  const sorted = [...shown].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b)

  const items: PageItem[] = []
  for (let i = 0; i < sorted.length; i++) {
    items.push(sorted[i])
    const next = sorted[i + 1]
    if (next == null) break
    const gap = next - sorted[i]
    if (gap === 2) items.push(sorted[i] + 1) // show the lone in-between page, not "…"
    else if (gap > 2) items.push('ellipsis')
  }
  return items
}
