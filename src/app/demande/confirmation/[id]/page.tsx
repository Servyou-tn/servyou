import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'

type Props = { params: Promise<{ id: string }> }

export default async function ConfirmationPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_type, status, quantity, delivery_name, delivery_address, delivery_phone, buyer_note, buyer_id, seller_id, products(title), service_listings(title)')
    .eq('id', id)
    .single()

  if (!order || order.buyer_id !== user.id) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-700">{t('orders.not_found', lang)}</h1>
          <Link href="/mes-demandes" className="block mt-4 text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('orders.back', lang)}</Link>
        </div>
      </main>
    )
  }

  const isProduct = order.order_type === 'product'
  const itemTitle = isProduct
    ? (order.products as unknown as { title: string } | null)?.title
    : (order.service_listings as unknown as { title: string } | null)?.title
  const { data: rawPhone } = await supabase.rpc('get_contact_phone', { target: order.seller_id })
  const sellerPhone = rawPhone?.replace(/\s+/g, '') ?? null

  const waMessage = isProduct
    ? t('product.whatsapp_buy_message', lang, { title: itemTitle ?? '' })
    : t('service.whatsapp_buy_message', lang, { title: itemTitle ?? '' })

  const waUrl = sellerPhone
    ? `https://wa.me/${sellerPhone}?text=${encodeURIComponent(waMessage)}`
    : null

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('orders.confirmed_title', lang)}</h1>
          <p className="text-gray-600 mb-6">{t('orders.contact_hint', lang)}</p>

          <div className="space-y-2 text-sm text-gray-700 mb-6">
            <div><span className="font-medium text-gray-500">{t('orders.type_label', lang)}</span> {isProduct ? t('orders.type_product', lang) : t('orders.type_service', lang)}</div>
            <div><span className="font-medium text-gray-500">{t('orders.item_label', lang)}</span> {itemTitle}</div>
            {isProduct && order.quantity && (
              <div><span className="font-medium text-gray-500">{t('orders.qty_label', lang)}</span> {order.quantity}</div>
            )}
            {isProduct && order.delivery_name && (
              <div><span className="font-medium text-gray-500">{t('orders.delivery_name_label', lang)}</span> {order.delivery_name}</div>
            )}
            {isProduct && order.delivery_address && (
              <div><span className="font-medium text-gray-500">{t('orders.address_label', lang)}</span> {order.delivery_address}</div>
            )}
            {isProduct && order.delivery_phone && (
              <div><span className="font-medium text-gray-500">{t('orders.phone_label', lang)}</span> {order.delivery_phone}</div>
            )}
            {order.buyer_note && (
              <div><span className="font-medium text-gray-500">{t('orders.note_label', lang)}</span> {order.buyer_note}</div>
            )}
            <div>
              <span className="font-medium text-gray-500">{t('orders.status_label', lang)}</span>{' '}
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">{t('common.status_pending', lang)}</span>
            </div>
          </div>

          {waUrl ? (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded text-base transition-colors">
              {t('orders.contact_seller', lang)}
            </a>
          ) : (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded px-4 py-3">
              {t('orders.seller_no_phone', lang)}
            </p>
          )}
        </div>

        <div className="flex gap-4 text-sm">
          <Link href="/mes-demandes" className="text-blue-600 hover:underline">{t('nav.orders', lang)}</Link>
          <Link href="/" className="text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('common.back_home', lang)}</Link>
        </div>
      </div>
    </main>
  )
}
