'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

export default function DemandeAchatPage() {
  const supabase = createClient()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [productTitle, setProductTitle] = useState('')
  const [shopOwnerId, setShopOwnerId] = useState('')
  const [productId, setProductId] = useState('')

  const [deliveryName, setDeliveryName] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [buyerNote, setBuyerNote] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const [{ data: product }, { data: profile }] = await Promise.all([
        supabase.from('products')
          // Cascade moderation: block the order flow for products of admin-moderated
          // shops (product → null → redirect to '/'), not just the detail page.
          .select('id, title, status, shops!inner(owner_id)')
          .eq('id', id)
          .eq('status', 'active')
          .is('shops.admin_hidden_at', null)
          .single(),
        supabase.from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single(),
      ])

      if (!product) { router.replace('/'); return }

      const shop = product.shops as unknown as { owner_id: string } | null
      setProductTitle(product.title)
      setProductId(product.id)
      setShopOwnerId(shop?.owner_id ?? '')
      setDeliveryName(profile?.full_name ?? '')
      setDeliveryPhone(profile?.phone ?? '')
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!deliveryName.trim()) { setError(t('product.error_delivery_name', lang)); return }
    if (!deliveryAddress.trim()) { setError(t('product.error_delivery_address', lang)); return }
    if (!deliveryPhone.trim()) { setError(t('product.error_phone', lang)); return }
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty < 1) { setError(t('product.error_quantity', lang)); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    setSaving(true)

    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: shopOwnerId,
        order_type: 'product',
        product_id: productId,
        service_listing_id: null,
        status: 'pending',
        delivery_name: deliveryName.trim(),
        delivery_address: deliveryAddress.trim(),
        delivery_phone: deliveryPhone.trim(),
        quantity: qty,
        buyer_note: buyerNote.trim() || null,
      })
      .select('id')
      .single()

    setSaving(false)

    if (insertError || !order) {
      setError(t('product.order_error_send', lang))
      return
    }

    router.push(`/demande/confirmation/${order.id}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">{t('common.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-start justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-lg shadow p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('product.order_title', lang)}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('product.order_prefix', lang)} <strong>{productTitle}</strong></p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="deliveryName">
              {t('product.field_delivery_name', lang)} <span className="text-red-500">*</span>
            </label>
            <input id="deliveryName" type="text" required value={deliveryName}
              onChange={e => setDeliveryName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="deliveryAddress">
              {t('product.field_delivery_address', lang)} <span className="text-red-500">*</span>
            </label>
            <textarea id="deliveryAddress" rows={2} required value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="deliveryPhone">
              {t('product.field_phone', lang)} <span className="text-red-500">*</span>
            </label>
            <input id="deliveryPhone" type="tel" required value={deliveryPhone}
              onChange={e => setDeliveryPhone(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="quantity">
              {t('product.field_quantity', lang)} <span className="text-red-500">*</span>
            </label>
            <input id="quantity" type="number" min="1" step="1" required value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="buyerNote">
              {t('product.field_note', lang)} <span className="text-gray-400 font-normal">{t('common.optional_f', lang)}</span>
            </label>
            <textarea id="buyerNote" rows={3} value={buyerNote}
              onChange={e => setBuyerNote(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded text-sm transition-colors">
            {saving ? t('common.submitting', lang) : t('common.send_request', lang)}
          </button>
        </form>
      </div>
    </main>
  )
}
