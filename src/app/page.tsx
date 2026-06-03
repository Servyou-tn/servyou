import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
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
      .select('id, title, starting_price_tnd, freelancer_profiles(city, profiles(full_name))')
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
              <Link href="/profile" className="text-gray-600 hover:underline">Mon profil</Link>
              <Link href="/mes-demandes" className="text-gray-600 hover:underline">Mes demandes</Link>
              <Link href="/mes-favoris" className="text-gray-600 hover:underline">Mes favoris</Link>
              <Link href="/mes-missions" className="text-gray-600 hover:underline">Mes missions</Link>
              {sellerType === 'shop_owner' && <Link href="/ma-boutique" className="text-gray-600 hover:underline">Ma boutique</Link>}
              {sellerType === 'freelancer' && <Link href="/mon-profil-freelance" className="text-gray-600 hover:underline">Mon espace freelance</Link>}
              {sellerType === 'freelancer' && <Link href="/mes-reponses" className="text-gray-600 hover:underline">Mes réponses</Link>}
              {sellerType === null && <Link href="/devenir-vendeur" className="text-blue-600 hover:underline">Devenir vendeur</Link>}
              <form action="/auth/signout" method="POST" className="inline">
                <button type="submit" className="text-red-500 hover:underline">Déconnexion</button>
              </form>
            </div>
          ) : (
            <div className="flex gap-3 text-sm items-center">
              <Link href="/missions" className="text-gray-600 hover:underline">Missions</Link>
              <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded transition-colors">Se connecter</Link>
              <Link href="/signup" className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-1.5 rounded transition-colors">Créer un compte</Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">

        {/* Search */}
        <section>
          <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">Trouvez des produits et services en Tunisie</h1>
          <form action="/recherche" method="GET" className="flex gap-2 max-w-xl mx-auto">
            <input name="q" type="text" placeholder="Rechercher un produit ou service…"
              className="flex-1 border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded text-sm transition-colors">
              Rechercher
            </button>
          </form>
        </section>

        {/* Categories */}
        {categories && categories.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Catégories</h2>
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
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Produits récents</h2>
          {!recentProducts || recentProducts.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucun produit disponible pour le moment.</p>
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
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Services récents</h2>
          {!recentServices || recentServices.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucun service disponible pour le moment.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(recentServices as unknown as { id: string; title: string; starting_price_tnd: number; freelancer_profiles: { city: string | null; profiles: { full_name: string } | null } | null }[]).map(s => {
                const fp = s.freelancer_profiles
                const name = fp?.profiles?.full_name
                return (
                  <Link key={s.id} href={`/service/${s.id}`}
                    className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col gap-1">
                    <p className="font-medium text-gray-800 text-sm line-clamp-2">{s.title}</p>
                    <p className="text-blue-700 font-semibold text-sm">Dès {Number(s.starting_price_tnd).toFixed(2)} TND</p>
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
