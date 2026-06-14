import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { SharedSearchBar } from '@/components/dashboard/shell/SharedSearchBar'
import { ListingResults } from '@/components/listings/ListingResults'
import { SearchIcon } from '@/components/dashboard/consumer/icons'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

// Unified, PUBLIC search results page (no auth — guests must browse without an
// account). Reads ?q & ?type; the SharedSearchBar drives both. Stays a root route
// with the global Header; it is NOT inside the (dashboard) shell.
export const metadata: Metadata = {
  title: 'Recherche — Servyou',
}

type Props = { searchParams: Promise<{ q?: string; type?: string }> }

type ServiceRow = {
  id: string
  title: string
  starting_price_tnd: number | null
  created_at: string
  freelancer_profiles: { city: string | null; profiles: { full_name: string } | null } | null
}

type ProductRow = {
  id: string
  title: string
  price_tnd: number
  created_at: string
  shops: { name: string; city: string | null } | null
}

function EmptyState({ lang }: { lang: Lang }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white p-8 text-center">
      <SearchIcon className="mx-auto h-12 w-12 text-text-muted" aria-hidden="true" />
      <p className="mt-4 text-base font-semibold text-text-primary">{t('recherche.empty.title', lang)}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">{t('recherche.empty.subtitle', lang)}</p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
      >
        {t('recherche.empty.cta', lang)}
      </Link>
    </div>
  )
}

export default async function RecherchePage({ searchParams }: Props) {
  const sp = await searchParams
  const query = sp.q?.trim() ?? ''
  const type: 'product' | 'service' = sp.type === 'service' ? 'service' : 'product'
  const lang = await getLang()
  const supabase = await createClient()
  const pattern = `%${query}%`

  let products: ProductListing[] = []
  let services: ServiceListing[] = []

  if (type === 'service') {
    let qb = supabase
      .from('service_listings')
      .select('id, title, starting_price_tnd, created_at, freelancer_profiles!inner(city, profiles:public_profiles(full_name))')
      .eq('status', 'active')
      .is('freelancer_profiles.admin_hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(30)
    if (query) qb = qb.ilike('title', pattern)
    const { data, error } = await qb
    if (error) console.error('[recherche] services fetch error:', error)
    services = ((data as unknown as ServiceRow[]) ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      price_starting: s.starting_price_tnd,
      created_at: s.created_at,
      freelancer: {
        full_name: s.freelancer_profiles?.profiles?.full_name ?? '—',
        city: s.freelancer_profiles?.city ?? null,
      },
    }))
  } else {
    let qb = supabase
      .from('products')
      .select('id, title, price_tnd, created_at, shops!inner(name, city)')
      .eq('status', 'active')
      .is('shops.admin_hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(30)
    if (query) qb = qb.ilike('title', pattern)
    const { data, error } = await qb
    if (error) console.error('[recherche] products fetch error:', error)
    products = ((data as unknown as ProductRow[]) ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      price_tnd: p.price_tnd,
      created_at: p.created_at,
      shop: { name: p.shops?.name ?? '—', city: p.shops?.city ?? null },
    }))
  }

  const count = type === 'service' ? services.length : products.length
  const resultWord = count === 1 ? t('category.result_singular', lang) : t('category.result_plural', lang)
  const countLine = query
    ? `${count} ${resultWord} ${t('search.result_for', lang)} « ${query} »`
    : `${count} ${resultWord}`

  return (
    <main className="min-h-screen bg-surface-subtle px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="max-w-[720px]">
          <SharedSearchBar initialQuery={query} initialType={type} />
        </div>
        <p className="mt-4 text-sm text-text-muted">{countLine}</p>
        <div className="mt-5">
          {count === 0 ? (
            <EmptyState lang={lang} />
          ) : type === 'service' ? (
            <ListingResults type="service" items={services} />
          ) : (
            <ListingResults type="product" items={products} />
          )}
        </div>
      </div>
    </main>
  )
}
