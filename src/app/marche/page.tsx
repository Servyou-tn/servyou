import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ListingResults } from '@/components/listings/ListingResults'
import { getActiveProducts, getActiveServices } from '@/lib/marche/data'
import { getShellUser } from '@/lib/marche/shell-user'
import { CARD_SHADOW } from '@/components/layout/styles'
import { PackageIcon, BriefcaseIcon } from '@/components/marche/icons'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

// The /marche marketplace browse page — public (no auth gate). Server component: reads the
// catalog toggle (type) and query (q) from the URL, fetches active products or services via
// the data layer, and renders the redesigned 4-per-row card grid. Product/service detail
// routes (/produits/[id], /services/[id]) don't exist yet — the card links 404 until they're
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

  // /marche is public — the top bar renders either way (logged-out shows the
  // "Se connecter" avatar). getShellUser returns null when there's no session.
  const shell = await getShellUser()
  const topBarUser = shell?.topBarUser ?? null

  const products = type === 'product' ? await getActiveProducts(q) : []
  const services = type === 'service' ? await getActiveServices(q) : []

  const isEmpty = type === 'product' ? products.length === 0 : services.length === 0

  return (
    <MarcheLayout user={topBarUser} searchType={type} searchQuery={q}>
      {isEmpty ? (
        <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <div className="mx-auto max-w-md">
            {type === 'product' ? (
              <PackageIcon className="mx-auto h-10 w-10 text-[#B8B8B8]" aria-hidden="true" />
            ) : (
              <BriefcaseIcon className="mx-auto h-10 w-10 text-[#B8B8B8]" aria-hidden="true" />
            )}
            <p className="mt-4 text-base font-semibold text-[#0A0A0A]">
              {t(type === 'product' ? 'marche.empty.products' : 'marche.empty.services', lang)}
            </p>
            <p className="mt-2 text-[13px] text-[#8B8B8B]">
              {t(
                type === 'product'
                  ? 'marche.empty.products_subtitle'
                  : 'marche.empty.services_subtitle',
                lang,
              )}
            </p>
          </div>
        </div>
      ) : type === 'product' ? (
        <ListingResults type="product" items={products} />
      ) : (
        <ListingResults type="service" items={services} />
      )}
    </MarcheLayout>
  )
}
