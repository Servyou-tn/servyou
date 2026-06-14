import { MarcheSidebar } from '@/components/marche/MarcheSidebar'
import { SharedSearchBar } from '@/components/dashboard/shell/SharedSearchBar'
import { ListingResults } from '@/components/listings/ListingResults'
import { getActiveProducts, getActiveServices } from '@/lib/marche/data'
import { CARD_SHADOW } from '@/components/layout/styles'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

// The /marche marketplace browse page — public (no auth gate). Server component: reads the
// catalog toggle (type) and query (q) from the URL, fetches active products or services via
// the data layer, and renders the redesigned cards. Product/service detail routes
// (/produits/[id], /services/[id]) don't exist yet — the card links 404 until they're
// rebuilt in follow-up commits (accepted U-curve, same as the disabled sidebar items).
export default async function MarchePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const rawType = Array.isArray(sp.type) ? sp.type[0] : sp.type
  const type: 'product' | 'service' = rawType === 'service' ? 'service' : 'product'
  const rawQ = Array.isArray(sp.q) ? sp.q[0] : sp.q
  const q = (rawQ ?? '').trim()

  const lang = await getLang()
  const products = type === 'product' ? await getActiveProducts(q) : []
  const services = type === 'service' ? await getActiveServices(q) : []

  const isEmpty = type === 'product' ? products.length === 0 : services.length === 0

  return (
    <div className="flex">
      <MarcheSidebar />
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          {/* Top bar — search + Produits/Services toggle only; reflects the URL state. */}
          <div className="max-w-2xl">
            <SharedSearchBar basePath="/marche" initialType={type} initialQuery={q} />
          </div>

          <div className="mt-8">
            {isEmpty ? (
              <div
                className={`flex min-h-[40vh] items-center justify-center rounded-2xl bg-white p-10 text-center text-sm text-text-muted ${CARD_SHADOW}`}
              >
                {t(type === 'product' ? 'marche.empty.products' : 'marche.empty.services', lang)}
              </div>
            ) : type === 'product' ? (
              <ListingResults type="product" items={products} />
            ) : (
              <ListingResults type="service" items={services} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
