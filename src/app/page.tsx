import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export default async function HomePage() {
  const supabase = await createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()

  let sellerType: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('seller_type').eq('id', user.id).single()
    sellerType = profile?.seller_type ?? null
  }

  const [{ data: categories }, { data: recentProducts }, { data: recentServices }] = await Promise.all([
    supabase.from('categories').select('id, name_fr, slug').order('name_fr'),
    supabase.from('products')
      .select('id, title, price_tnd, shops(name, city)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('service_listings')
      .select('id, title, starting_price_tnd, freelancer_profiles(city, profiles:public_profiles(full_name))')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return (
    <main className="min-h-screen bg-gray-50">

      {/* User area */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span className="font-bold text-gray-800 text-lg">Servyou</span>
          {user ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link href="/profile" className="text-gray-600 hover:underline">{t('nav.profile', lang)}</Link>
              <Link href="/mes-demandes" className="text-gray-600 hover:underline">{t('nav.orders', lang)}</Link>
              <Link href="/mes-favoris" className="text-gray-600 hover:underline">{t('nav.favorites', lang)}</Link>
              <Link href="/mes-missions" className="text-gray-600 hover:underline">{t('nav.missions', lang)}</Link>
              {sellerType === 'shop_owner' && <Link href="/ma-boutique" className="text-gray-600 hover:underline">{t('nav.shop', lang)}</Link>}
              {sellerType === 'freelancer' && <Link href="/mon-profil-freelance" className="text-gray-600 hover:underline">{t('nav.freelance_space', lang)}</Link>}
              {sellerType === 'freelancer' && <Link href="/mes-reponses" className="text-gray-600 hover:underline">{t('nav.my_responses', lang)}</Link>}
              {sellerType === null && <Link href="/devenir-vendeur" className="text-blue-600 hover:underline">{t('nav.become_seller', lang)}</Link>}
              <form action="/auth/signout" method="POST" className="inline">
                <button type="submit" className="text-red-500 hover:underline">{t('nav.logout', lang)}</button>
              </form>
            </div>
          ) : (
            <div className="flex gap-3 text-sm items-center">
              <Link href="/missions" className="text-gray-600 hover:underline">{t('nav.missions_board', lang)}</Link>
              <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded transition-colors">{t('nav.login', lang)}</Link>
              <Link href="/signup" className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-1.5 rounded transition-colors">{t('nav.signup', lang)}</Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">

        {/* Search */}
        <section>
          <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">{t('home.hero', lang)}</h1>
          <form action="/recherche" method="GET" className="flex gap-2 max-w-xl mx-auto">
            <input name="q" type="text" placeholder={t('home.search_placeholder', lang)}
              className="flex-1 border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded text-sm transition-colors">
              {t('home.search_btn', lang)}
            </button>
          </form>
        </section>

        {/* Categories */}
        {categories && categories.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">{t('home.categories', lang)}</h2>
            <div className="flex flex-wrap gap-2">
              {(categories as unknown as { id: string; name_fr: string; slug: string }[]).map(c => (
                <Link key={c.id} href={`/categorie/${c.slug}`}
                  className="bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-700 text-sm px-4 py-2 rounded-full transition-colors shadow-sm">
                  {c.name_fr}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent products */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">{t('home.recent_products', lang)}</h2>
          {!recentProducts || recentProducts.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('home.no_products', lang)}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(recentProducts as unknown as { id: string; title: string; price_tnd: number; shops: { name: string; city: string } | null }[]).map(p => (
                <Link key={p.id} href={`/produit/${p.id}`}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col gap-1">
                  <p className="font-medium text-gray-800 text-sm line-clamp-2">{p.title}</p>
                  <p className="text-blue-700 font-semibold text-sm">{Number(p.price_tnd).toFixed(2)} TND</p>
                  {p.shops && <p className="text-xs text-gray-500">{p.shops.name} · {p.shops.city}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent services */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">{t('home.recent_services', lang)}</h2>
          {!recentServices || recentServices.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('home.no_services', lang)}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(recentServices as unknown as { id: string; title: string; starting_price_tnd: number; freelancer_profiles: { city: string | null; profiles: { full_name: string } | null } | null }[]).map(s => {
                const fp = s.freelancer_profiles
                const name = fp?.profiles?.full_name
                return (
                  <Link key={s.id} href={`/service/${s.id}`}
                    className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col gap-1">
                    <p className="font-medium text-gray-800 text-sm line-clamp-2">{s.title}</p>
                    <p className="text-blue-700 font-semibold text-sm">{t('home.from_price', lang)} {Number(s.starting_price_tnd).toFixed(2)} TND</p>
                    {(name || fp?.city) && <p className="text-xs text-gray-500">{name ?? ''}{name && fp?.city ? ' · ' : ''}{fp?.city ?? ''}</p>}
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
