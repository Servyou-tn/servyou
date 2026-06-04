'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidPhone, normalizePhone } from '@/lib/phone'

export default function DemandeServicePage() {
  const supabase = createClient()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [serviceTitle, setServiceTitle] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [buyerNote, setBuyerNote] = useState('')
  const [profilePhone, setProfilePhone] = useState<string | null>(null)
  const [phoneInput, setPhoneInput] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: service } = await supabase
        .from('service_listings')
        .select('id, title, status, freelancer_profiles(profile_id)')
        .eq('id', id)
        .eq('status', 'active')
        .single()

      if (!service) { router.replace('/'); return }

      const fp = service.freelancer_profiles as unknown as { profile_id: string } | null
      setServiceTitle(service.title)
      setServiceId(service.id)
      setSellerId(fp?.profile_id ?? '')

      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('phone').eq('id', user.id).single()
      if (profileErr) console.error('[service/demande] profile fetch error:', profileErr)
      setProfilePhone(profile?.phone ?? null)

      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    setSaving(true)

    if (!profilePhone) {
      if (!isValidPhone(phoneInput)) {
        setError('Format attendu : 8 chiffres (ex. 20 123 456) ou +216 suivi de 8 chiffres.')
        setSaving(false)
        return
      }
      const { error: phoneErr } = await supabase
        .from('profiles')
        .update({ phone: normalizePhone(phoneInput) })
        .eq('id', user.id)
      if (phoneErr) {
        console.error('[service/demande] phone update error:', phoneErr)
        setError('Impossible de sauvegarder le numéro. Veuillez réessayer.')
        setSaving(false)
        return
      }
    }

    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: sellerId,
        order_type: 'service',
        service_listing_id: serviceId,
        product_id: null,
        status: 'pending',
        buyer_note: buyerNote.trim() || null,
      })
      .select('id')
      .single()

    setSaving(false)

    if (insertError || !order) {
      setError('Une erreur est survenue lors de l\'envoi de la demande. Veuillez réessayer.')
      return
    }

    router.push(`/demande/confirmation/${order.id}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-start justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-lg shadow p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Demande de service</h1>
        <p className="text-sm text-gray-500 mb-6">Service : <strong>{serviceTitle}</strong></p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="buyerNote">
              Message pour le prestataire <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea id="buyerNote" rows={4} value={buyerNote}
              onChange={e => setBuyerNote(e.target.value)}
              placeholder="Décrivez votre besoin, vos contraintes, vos questions…"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {!profilePhone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="whatsapp">
                Numéro WhatsApp <span className="text-red-500">*</span>
              </label>
              <input id="whatsapp" type="tel" required value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="Ex : 20 000 000, 056 480 920, +216 20 000 000"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">
                Nécessaire pour que le freelance puisse vous contacter via WhatsApp.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={saving || (!profilePhone && !phoneInput.trim())}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded text-sm transition-colors">
            {saving ? 'Envoi en cours…' : 'Envoyer la demande'}
          </button>
        </form>
      </div>
    </main>
  )
}
