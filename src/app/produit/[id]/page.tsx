import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FavoriteButton } from '@/components/FavoriteButton'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'

type Props = { params: Promise<{ id: string }> }

export default async function ProduitPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const lang = await getLang()

  const { data: product } = await supabase
    .from('products')
    .select('id, title, description, price_tnd, tracks_stock, stock_count, status, categories(name_fr), shops(id, name, city, owner_id)')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!product) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-700">{t('product.not_found', lang)}</h1>
          <p className="text-gray-500 text-sm mt-2">{t('product.not_found_desc', lang)}</p>
          <Link href="/" className="block mt-4 text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('common.back_home', lang)}</Link>
        </div>
      </main>
    )
  }

  const shop = product.shops as unknown as { id: string; name: string; city: string; owner_id: string } | null
  const category = product.categories as unknown as { name_fr: string } | null

  const stockLabel = product.tracks_stock
    ? (product.stock_count != null && product.stock_count > 0
        ? t('product.stock_in_stock', lang, { n: product.stock_count })
        : t('common.status_sold_out', lang))
    : t('common.stock_always', lang)

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 mb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h1 className="text-2xl font-bold text-gray-800">{product.title}</h1>
            <FavoriteButton item_type="product" item_id={product.id} />
          </div>

          <p className="text-2xl text-blue-700 font-bold mb-4">{Number(product.price_tnd).toFixed(2)} TND</p>

          {category && (
            <p className="text-sm text-gray-500 mb-2">
              {t('product.category_label', lang)} <span className="text-gray-700">{category.name_fr}</span>
            </p>
          )}

          <p className="text-sm text-gray-500 mb-4">
            {t('product.stock_label', lang)} <span className="text-gray-700">{stockLabel}</span>
          </p>

          {product.description && (
            <p className="text-gray-700 mb-6 whitespace-pre-line">{product.description}</p>
          )}

          {shop && (
            <div className="border-t border-gray-100 pt-4 mb-6">
              <p className="text-sm text-gray-500">
                {t('product.sold_by', lang)}{' '}
                <Link href={`/boutique/${shop.id}`} className="text-blue-600 hover:underline font-medium">
                  {shop.name}
                </Link>
                {' '}· {shop.city}
              </p>
            </div>
          )}

          <Link href={`/produit/${id}/demande`}
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded text-base transition-colors">
            {t('product.buy_cta', lang)}
          </Link>
        </div>

        <Link href="/" className="text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('common.back_home', lang)}</Link>
      </div>
    </main>
  )
}
