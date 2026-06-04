import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'

export default async function MesFavorisPage() {
  const supabase = await createClient()
  const lang = await getLang()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: favorites } = await supabase
    .from('favorites')
    .select(`
      id, item_type, created_at,
      product:product_id (id, title, price_tnd, status, shops(name, city)),
      service:service_listing_id (id, title, starting_price_tnd, status, freelancer_profiles(city, profiles:public_profiles(full_name)))
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  type FavProduct = { id: string; title: string; price_tnd: number; status: string; shops: { name: string; city: string } | null } | null
  type FavService = { id: string; title: string; starting_price_tnd: number; status: string; freelancer_profiles: { city: string | null; profiles: { full_name: string } | null } | null } | null
  type Favorite = { id: string; item_type: string; created_at: string; product: FavProduct; service: FavService }

  const favs = (favorites ?? []) as unknown as Favorite[]

  const productFavs = favs.filter(f => f.item_type === 'product' && f.product?.status === 'active')
  const serviceFavs = favs.filter(f => f.item_type === 'service' && f.service?.status === 'active')

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{t('favorites.title', lang)}</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('favorites.back', lang)}</Link>
        </div>

        {/* Products */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">{t('common.products_section', lang)} ({productFavs.length})</h2>
          {productFavs.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('favorites.no_products', lang)}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {productFavs.map(f => {
                const p = f.product!
                return (
                  <Link key={f.id} href={`/produit/${p.id}`}
                    className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col gap-1">
                    <p className="font-medium text-gray-800 text-sm line-clamp-2">{p.title}</p>
                    <p className="text-blue-700 font-semibold text-sm">{Number(p.price_tnd).toFixed(2)} TND</p>
                    {p.shops && <p className="text-xs text-gray-500">{p.shops.name} · {p.shops.city}</p>}
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Services */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">{t('common.services_section', lang)} ({serviceFavs.length})</h2>
          {serviceFavs.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('favorites.no_services', lang)}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {serviceFavs.map(f => {
                const s = f.service!
                const fp = s.freelancer_profiles
                const name = fp?.profiles?.full_name
                return (
                  <Link key={f.id} href={`/service/${s.id}`}
                    className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col gap-1">
                    <p className="font-medium text-gray-800 text-sm line-clamp-2">{s.title}</p>
                    <p className="text-blue-700 font-semibold text-sm">{t('home.from_price', lang)} {Number(s.starting_price_tnd).toFixed(2)} TND</p>
                    {(name || fp?.city) && (
                      <p className="text-xs text-gray-500">
                        {name ?? ''}{name && fp?.city ? ' · ' : ''}{fp?.city ?? ''}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
