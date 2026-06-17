// Pure category-scoping helper. The marketplace taxonomy is unified — one `categories`
// row serves both products AND service listings (there is no `type` column; see
// data-model.md). So a browse engine's filter can't be scoped "by category type". It is
// scoped by USAGE instead: only the categories that actually carry an active listing of
// that engine's type. A category used by BOTH sides (e.g. Beauté & Soins) correctly
// appears in both filters — that is not a leak.
//
// Kept dependency-free (no Supabase import) so it is unit-tested directly. The data layer
// in filter-categories.ts feeds it the active rows.
export function distinctActiveCategoryIds(
  rows: { category_id: string | null }[],
): string[] {
  const seen = new Set<string>()
  for (const row of rows) {
    if (row.category_id) seen.add(row.category_id)
  }
  return [...seen]
}
