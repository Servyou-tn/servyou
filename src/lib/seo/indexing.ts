// Search-engine indexing switch (founder decision, 16 Nov 2026).
//
// servyou.tn went live on 16 Nov 2026 while production still holds test data (demo shops, test orders). Until the
// public launch, EVERY response carries `X-Robots-Tag: noindex, nofollow`: search engines index nothing on servyou.tn
// and drop what they already indexed on servyou.vercel.app.
//
// Why a response header and not robots.txt: a page that robots.txt blocks is never fetched, so its noindex is never
// seen and its URL can still be indexed from links. The header is read on every crawled response, and Google applies
// the most restrictive rule, so it outranks a public page's own robots « index » (publicMetadata()). robots.txt and
// the sitemap stay as they are, so crawlers keep fetching pages and keep seeing the header.
//
// Vercel preview deployments already send their own noindex; this covers production.
//
// LAUNCH DAY: set SEARCH_INDEXING_OPEN to true in its own PR (launch checklist, launch-day step). Nothing else
// changes: every public page already opts in to indexing through publicMetadata().

/** false until the public launch: the whole site stays out of search indexes. */
export const SEARCH_INDEXING_OPEN = false

/** The header that keeps a response out of search indexes while indexing is closed. */
export const NOINDEX_HEADER = { key: 'X-Robots-Tag', value: 'noindex, nofollow' } as const

/** Pure: the indexing headers served on every route (none once indexing is open). */
export function indexingHeaders(open: boolean = SEARCH_INDEXING_OPEN): { key: string; value: string }[] {
  return open ? [] : [{ ...NOINDEX_HEADER }]
}
