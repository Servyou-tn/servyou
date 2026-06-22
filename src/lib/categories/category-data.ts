import { createClient } from '@/lib/supabase/server'

// Read helpers for /categories/[slug]. Categories are a public, admin-controlled taxonomy
// (anyone can SELECT), so the anon server client is enough.

export type Category = {
  id: string
  slug: string
  name_fr: string
  name_ar: string
  parent_id: string | null
}

export type Subcategory = {
  id: string
  slug: string
  name_fr: string
  name_ar: string
}

/** Resolve a URL slug to its category row, or null if the slug doesn't exist (→ 404). */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name_fr, name_ar, parent_id')
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('[categories] slug resolve error:', error)
    return null
  }
  return (data as Category | null) ?? null
}

/**
 * Direct children of a category (for the drill-down strip). NOTE: the categories table is
 * flat today (no row has a parent_id), so this returns [] for every category until a
 * nesting migration adds parent/child relationships. The strip renders nothing on []. */
export async function getSubcategories(parentId: string): Promise<Subcategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name_fr, name_ar')
    .eq('parent_id', parentId)
    .order('name_fr')
  if (error) {
    console.error('[categories] subcategories fetch error:', error)
    return []
  }
  return (data ?? []) as Subcategory[]
}
