import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

export default async function PublicShopPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, description, city, profiles:public_profiles(full_name)')
    .eq('id', id)
    .single()

  if (!shop) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-700">Boutique introuvable</h1>
          <p className="text-gray-500 text-sm mt-2">Cette boutique n'existe pas ou a été supprimée.</p>
        </div>
      </main>
    )
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, title, price_tnd, tracks_stock, stock_count, categories(name_fr)')
    .eq('shop_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const ownerName = (shop.profiles as unknown as { full_name: string } | null)?.full_name

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">{shop.name}</h1>
          <p className="text-sm text-gray-500 mb-1">{shop.city}</p>
          {ownerName && (
            <p className="text-sm text-gray-500 mb-3">Vendeur : {ownerName}</p>
          )}
          {shop.description && (
            <p className="text-gray-700 mt-3">{shop.description}</p>
          )}
        </div>

        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Produits disponibles
          {products && products.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({products.length})</span>
          )}
        </h2>

        {!products || products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Aucun produit disponible pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map(p => {
              const category = (p.categories as unknown as { name_fr: string } | null)?.name_fr
              const stockLabel = p.tracks_stock
                ? (p.stock_count != null && p.stock_count > 0 ? `${p.stock_count} en stock` : 'Épuisé')
                : 'Toujours disponible'

              return (
                <div key={p.id} className="bg-white rounded-lg shadow p-5 flex flex-col gap-2">
                  <h3 className="font-semibold text-gray-800">{p.title}</h3>
                  {category && (
                    <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 w-fit">
                      {category}
                    </span>
                  )}
                  <p className="text-blue-700 font-medium">{Number(p.price_tnd).toFixed(2)} TND</p>
                  <p className="text-xs text-gray-500">{stockLabel}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
