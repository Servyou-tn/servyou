import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import {
  type PaymentMethod,
  type ShopType,
  type DeliverySetup,
  shopTypeLabelKey,
  deliverySetupLabelKey,
  paymentMethodLabelKey,
} from '@/lib/types/shop-config'

type Props = { params: Promise<{ id: string }> }

export default async function PublicShopPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const lang = await getLang()

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select(`
      id, name, description, city, logo_url, banner_url,
      shop_type, delivery_setup, working_hours, location_detail, preferred_carriers,
      profiles:public_profiles(full_name)
    `)
    .eq('id', id)
    .is('admin_hidden_at', null) // hide admin-moderated shops from the public detail page
    .single()
  if (shopError) console.error('[boutique/[id]] shop fetch error:', shopError)

  if (!shop) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-700">{t('boutique.not_found', lang)}</h1>
          <p className="text-gray-500 text-sm mt-2">{t('boutique.not_found_desc', lang)}</p>
        </div>
      </main>
    )
  }

  const { data: paymentMethodRows, error: paymentError } = await supabase
    .from('shop_payment_methods')
    .select('method')
    .eq('shop_id', id)
  if (paymentError) console.error('[boutique/[id]] shop_payment_methods fetch error:', paymentError)
  const paymentMethods = ((paymentMethodRows ?? []) as { method: PaymentMethod }[]).map(r => r.method)

  const { data: categoryRows, error: categoryError } = await supabase
    .from('shop_categories')
    .select('categories(id, name_fr, name_ar)')
    .eq('shop_id', id)
  if (categoryError) console.error('[boutique/[id]] shop_categories fetch error:', categoryError)
  const categories = ((categoryRows ?? []) as unknown as Array<{ categories: { id: string; name_fr: string; name_ar: string } | null }>)
    .map(r => r.categories)
    .filter(Boolean) as Array<{ id: string; name_fr: string; name_ar: string }>

  const { data: products } = await supabase
    .from('products')
    .select('id, title, price_tnd, tracks_stock, stock_count, categories(name_fr)')
    .eq('shop_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const ownerName = (shop.profiles as unknown as { full_name: string } | null)?.full_name

  const categoryDisplayName = (cat: { name_fr: string; name_ar: string }) =>
    lang === 'ar' ? cat.name_ar : cat.name_fr

  const hasConfigInfo = Boolean(
    shop.shop_type || shop.delivery_setup || shop.working_hours ||
    shop.location_detail || shop.preferred_carriers ||
    paymentMethods.length > 0 || categories.length > 0
  )

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
          {shop.banner_url && (
            <img src={shop.banner_url} alt="" className="h-40 w-full object-cover rounded-t-lg" />
          )}
          <div className="p-8">
            <div className="flex items-center gap-4 mb-1">
              {shop.logo_url && (
                <img src={shop.logo_url} alt={shop.name} className="h-16 w-16 rounded-full border-2 border-white object-cover" />
              )}
              <h1 className="text-3xl font-bold text-gray-800">{shop.name}</h1>
            </div>
            <p className="text-sm text-gray-500 mb-1">{shop.city}</p>
            {ownerName && (
              <p className="text-sm text-gray-500 mb-3">{t('boutique.seller_label', lang)} {ownerName}</p>
            )}
            {shop.description && (
              <p className="text-gray-700 mt-3">{shop.description}</p>
            )}

            {hasConfigInfo && <hr className="my-4 border-gray-200" />}

            {shop.shop_type && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">{t('boutique.field_shop_type', lang)}: </span>
                <span className="text-sm text-gray-900">{t(shopTypeLabelKey(shop.shop_type as ShopType), lang)}</span>
              </div>
            )}
            {shop.delivery_setup && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">{t('boutique.field_delivery_setup', lang)}: </span>
                <span className="text-sm text-gray-900">{t(deliverySetupLabelKey(shop.delivery_setup as DeliverySetup), lang)}</span>
              </div>
            )}
            {shop.working_hours && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">{t('boutique.field_working_hours', lang)}: </span>
                <span className="text-sm text-gray-900">{shop.working_hours}</span>
              </div>
            )}
            {shop.location_detail && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">{t('boutique.field_location_detail', lang)}: </span>
                <span className="text-sm text-gray-900">{shop.location_detail}</span>
              </div>
            )}
            {shop.preferred_carriers && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">{t('boutique.field_preferred_carriers', lang)}: </span>
                <span className="text-sm text-gray-900">{shop.preferred_carriers}</span>
              </div>
            )}
            {paymentMethods.length > 0 && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">{t('boutique.field_payment_methods', lang)}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paymentMethods.map(method => (
                    <span key={method} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                      {t(paymentMethodLabelKey(method), lang)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {categories.length > 0 && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">{t('boutique.field_category_specialties', lang)}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <span key={cat.id} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                      {categoryDisplayName(cat)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          {t('boutique.available_products', lang)}
          {products && products.length > 0 && (
            <span className="ms-2 text-sm font-normal text-gray-400">({products.length})</span>
          )}
        </h2>

        {!products || products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {t('home.no_products', lang)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map(p => {
              const category = (p.categories as unknown as { name_fr: string } | null)?.name_fr
              const stockLabel = p.tracks_stock
                ? (p.stock_count != null && p.stock_count > 0
                    ? t('product.stock_in_stock', lang, { n: p.stock_count })
                    : t('common.status_sold_out', lang))
                : t('common.stock_always', lang)

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
