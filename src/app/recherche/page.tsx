import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Props = { searchParams: Promise<{ q?: string }> }

export default async function RecherchePage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''
  const supabase = await createClient()

  if (!query) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Recherche</h1>
          <p className="text-gray-500">Veuillez entrer un terme de recherche.</p>
          <div className="mt-4">
            <form action="/recherche" method="GET" className="flex gap-2 max-w-md">
              <input name="q" type="text" autoFocus placeholder="Rechercher…"
                className="flex-1 border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded text-sm transition-colors">
                Rechercher
              </button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  const pattern = `%${query}%`

  const [{ data: products }, { data: services }] = await Promise.all([
    supabase.from('products')
      .select('id, title, price_tnd, shops(name, city)')
      .eq('status', 'active')
      .ilike('title', pattern)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('service_listings')
      .select('id, title, starting_price_tnd, freelancer_profiles(city, profiles:public_profiles(full_name))')
      .eq('status', 'active')
      .ilike('title', pattern)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const totalResults = (products?.length ?? 0) + (services?.length ?? 0)

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <form action="/recherche" method="GET" className="flex gap-2 max-w-md mb-4">
            <input name="q" type="text" defaultValue={query}
              className="flex-1 border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded text-sm transition-colors">
              Rechercher
            </button>
          </form>
          <p className="text-sm text-gray-500">
            {totalResults} résultat{totalResults !== 1 ? 's' : ''} pour «&nbsp;{query}&nbsp;»
          </p>
        </div>

        {products && products.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Produits</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(products as unknown as { id: string; title: string; price_tnd: number; shops: { name: string; city: string } | null }[]).map(p => (
                <Link key={p.id} href={`/produit/${p.id}`}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col gap-1">
                  <p className="font-medium text-gray-800 text-sm line-clamp-2">{p.title}</p>
                  <p className="text-blue-700 font-semibold text-sm">{Number(p.price_tnd).toFixed(2)} TND</p>
                  {p.shops && <p className="text-xs text-gray-500">{p.shops.name} · {p.shops.city}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {services && services.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Services</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(services as unknown as { id: string; title: string; starting_price_tnd: number; freelancer_profiles: { city: string | null; profiles: { full_name: string } | null } | null }[]).map(s => {
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
          </section>
        )}

        {totalResults === 0 && (
          <p className="text-gray-500">Aucun résultat pour cette recherche. Essayez un autre terme.</p>
        )}

        <Link href="/" className="text-sm text-blue-600 hover:underline">← Retour à l'accueil</Link>
      </div>
    </main>
  )
}
