import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { reportQueryError } from '@/lib/supabase/query-error'

// The database part of /sitemap.xml (audit checklist 5): the public detail pages and the categories, read with a
// cookie-less ANON client so Row Level Security decides what is public — never the visitor's session (an admin
// opening /sitemap.xml must not list hidden rows). The filters repeat the detail pages' own loaders, so every URL
// listed is one an anonymous visitor can open.
//
// Capped at SITEMAP_CAP rows per kind (Supabase's REST API returns at most 1,000 rows per read), freshest first.
// A failed read is reported and that kind is left out; the rest of the sitemap still answers.

export const SITEMAP_CAP = 1000

export type SitemapRow = { path: string; lastModified?: string }

type Client = SupabaseClient<Database>

async function readKind(
  where: string,
  query: PromiseLike<{ data: { id?: string; slug?: string; updated_at: string }[] | null; error: { message: string; code?: string } | null }>,
  toPath: (row: { id?: string; slug?: string }) => string,
): Promise<SitemapRow[]> {
  const { data, error } = await query
  if (error) {
    reportQueryError(`sitemap ${where}`, error)
    return []
  }
  return (data ?? []).map((row) => ({ path: toPath(row), lastModified: row.updated_at }))
}

export async function readSitemapRows(client: Client): Promise<SitemapRow[]> {
  const [freelancers, shops, products, services, categories] = await Promise.all([
    readKind(
      'freelancers',
      client
        .from('freelancer_profiles')
        .select('id, updated_at')
        .eq('is_published', true)
        .is('admin_hidden_at', null)
        .order('updated_at', { ascending: false })
        .limit(SITEMAP_CAP),
      (r) => `/freelance/${r.id}`,
    ),
    readKind(
      'shops',
      client.from('shops').select('id, updated_at').is('admin_hidden_at', null).order('updated_at', { ascending: false }).limit(SITEMAP_CAP),
      (r) => `/boutique/${r.id}`,
    ),
    readKind(
      'products',
      client
        .from('products')
        .select('id, updated_at, shops!inner ( admin_hidden_at )')
        .eq('status', 'active')
        .is('admin_hidden_at', null)
        .is('shops.admin_hidden_at', null)
        .order('updated_at', { ascending: false })
        .limit(SITEMAP_CAP),
      (r) => `/produits/${r.id}`,
    ),
    readKind(
      'services',
      client
        .from('service_listings')
        .select('id, updated_at, freelancer_profiles!inner ( admin_hidden_at )')
        .eq('status', 'active')
        .is('admin_hidden_at', null)
        .is('freelancer_profiles.admin_hidden_at', null)
        .order('updated_at', { ascending: false })
        .limit(SITEMAP_CAP),
      (r) => `/services/${r.id}`,
    ),
    readKind(
      'categories',
      client.from('categories').select('slug, updated_at').order('slug').limit(SITEMAP_CAP),
      (r) => `/categories/${encodeURIComponent(r.slug ?? '')}`,
    ),
  ])
  return [...categories, ...services, ...freelancers, ...products, ...shops]
}
