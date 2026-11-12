import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { siteUrl } from '@/lib/seo/site-url'
import { PUBLIC_STATIC_PATHS } from '@/lib/seo/routes'
import { readSitemapRows, type SitemapRow } from '@/lib/seo/sitemap-data'

// /sitemap.xml (audit checklist 5): the public static pages, then the public detail pages and categories read with
// a cookie-less anon client (src/lib/seo/sitemap-data.ts). Rebuilt at most once an hour. Without Supabase env (CI's
// build) it lists the static pages only.
export const revalidate = 3600

async function databaseRows(): Promise<SitemapRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.warn('[sitemap] Supabase env missing: listing the static pages only')
    return []
  }
  const anon = createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return readSitemapRows(anon)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const rows: SitemapRow[] = [...PUBLIC_STATIC_PATHS.map((path) => ({ path })), ...(await databaseRows())]
  return rows.map(({ path, lastModified }) => ({
    url: path === '/' ? `${base}/` : `${base}${path}`,
    ...(lastModified ? { lastModified } : {}),
  }))
}
