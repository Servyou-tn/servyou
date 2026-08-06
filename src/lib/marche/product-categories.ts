import { createClient } from '@/lib/supabase/server'

// Categories for the G6 « Ajouter un produit » picker. Public-readable reference data.
//
// PRODUCT-SIDE ONLY, and the exact mirror of the mission picker (`my-data.ts` getCategories, PR
// #112). `categories` is ONE FLAT TABLE shared by products, service_listings, job_posts and
// shop_categories, so `categories.kind` (migration 20260804132447) is the only thing separating
// them. Without it this select would offer a shop owner "Montage Vidéo" and "Développement" for a
// physical product — the mirror image of the defect #112 closed on the mission side.
//
// ⚑ MATCHED WITH `in`, NEVER WITH EQUALITY. 'both' is a real value: `maison` carries it, because
// ménage / plomberie / bricolage is a real Tunisian market the digital-only service taxonomy has
// not reached yet. `eq('kind','product')` reads as equivalent and silently drops it.
//
// ⚑ Maison therefore appears in BOTH pickers — 6 rows here, 9 on the mission side. That is what
// 'both' is FOR. It is not a leak and it is not a bug to fix.
//
// ONE LEVEL ONLY. The live table is flat — `parent_id` is NULL on all 14 rows — so there is no
// subcategory to cascade to. `src/lib/taxonomy/product-categories.ts` describes a 2-level
// 11-sector/57-subcategory taxonomy that the database does not have; it is NOT consumed here.
// Reconciling the two is its own migration PR (g6-discovery.md §6 B2).

// `name_ar` is selected because Servyou is FR + AR at parity and the column is fully populated for
// every category. Rendering name_fr in an Arabic page would be a visible i18n hole in the middle of
// an otherwise-translated form. `name_ar` is typed nullable and the form falls back to name_fr, so
// a future category added without a translation degrades rather than renders blank.
//
// ⚑ The MISSION picker (`my-data.ts` getCategories) still selects name_fr only and shows French
// category names in the Arabic form. Same gap, different surface — NOT fixed here (PR #112 shipped
// it and this is a one-PR-one-focus repo). Logged for its own pass.
export type ProductCategory = { id: string; name_fr: string; name_ar: string | null }

export async function getProductCategories(): Promise<ProductCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_fr, name_ar')
    .in('kind', ['product', 'both'])
    // Ordered by name_fr in both locales. Ordering by the displayed name would reshuffle the list
    // between FR and AR, and a picker whose order depends on the language is harder to learn.
    .order('name_fr')

  if (error) {
    console.error('[product-categories] fetch error:', error.message, error.code, error.details)
    return []
  }
  return (data ?? []) as ProductCategory[]
}
