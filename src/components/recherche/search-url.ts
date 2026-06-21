// Pure query-string builder shared by every /recherche client control (tabs, sort,
// filters, pagination). Kept render-free and framework-free so it is unit-tested
// directly (see search-url.test.ts). The controls call this, then router.push the result.

export type ParamPatch = Record<string, string | number | string[] | null | undefined>

/**
 * Merge `patch` into the current params and return the resulting query string.
 *
 * - Empty values (null, undefined, '', []) DELETE their key — so toggling a filter off
 *   cleanly removes it from the URL.
 * - Array values are written comma-joined (?categorie=mode,tech).
 * - `resetPage` drops the page param when a filter/sort changes (a new result set always
 *   starts at page 1); it is ignored when the patch itself sets `page` (pagination).
 * - `page=1` is always stripped as URL noise (page 1 is the implicit default).
 */
export function buildSearchQuery(
  current: URLSearchParams | string,
  patch: ParamPatch,
  opts: { resetPage?: boolean } = {},
): string {
  const params = new URLSearchParams(typeof current === 'string' ? current : current.toString())

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
      params.delete(key)
    } else if (Array.isArray(value)) {
      params.set(key, value.join(','))
    } else {
      params.set(key, String(value))
    }
  }

  if (opts.resetPage && !('page' in patch)) params.delete('page')
  if (params.get('page') === '1') params.delete('page')

  return params.toString()
}
