'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
  'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
  'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
]

type Shop = {
  id: string
  name: string
  description: string | null
  city: string | null
  logo_url: string | null
  banner_url: string | null
}

export default function ModifierBoutiquePage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [shopId, setShopId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('seller_type').eq('id', user.id).single()
      if (!profile || profile.seller_type !== 'shop_owner') { router.replace('/devenir-vendeur'); return }

      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id, name, description, city, logo_url, banner_url')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (shopError) console.error('[ma-boutique/modifier] shop fetch error:', shopError)
      if (!shop) { router.replace('/ma-boutique/creer'); return }

      const s = shop as Shop
      setShopId(s.id)
      setName(s.name)
      setDescription(s.description ?? '')
      setCity(s.city ?? '')
      setLogoUrl(s.logo_url ?? '')
      setBannerUrl(s.banner_url ?? '')
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError(t('boutique.error_name', lang)); return }
    if (!city) { setError(t('boutique.error_city', lang)); return }

    setSaving(true)

    const { error: updateError } = await supabase.from('shops').update({
      name: name.trim(),
      description: description.trim() || null,
      city,
      logo_url: logoUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
    }).eq('id', shopId)

    setSaving(false)

    if (updateError) {
      setError(t('boutique.error_save', lang))
      return
    }

    router.push('/ma-boutique')
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('boutique.edit_title', lang)}</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
              {t('boutique.shop_name_field', lang)} <span className="text-red-500">*</span>
            </label>
            <input id="name" type="text" required value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              {t('common.field_description', lang)} <span className="text-gray-400 font-normal">{t('common.optional_f', lang)}</span>
            </label>
            <textarea id="description" rows={3} value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="city">
              {t('signup.city', lang)} <span className="text-red-500">*</span>
            </label>
            <select id="city" required value={city} onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">{t('signup.city_placeholder', lang)}</option>
              {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="logoUrl">
              {t('boutique.field_logo', lang)} <span className="text-gray-400 font-normal">{t('common.optional_m', lang)}</span>
            </label>
            <input id="logoUrl" type="url" value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">{t('boutique.image_url_hint', lang)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bannerUrl">
              {t('boutique.field_banner', lang)} <span className="text-gray-400 font-normal">{t('common.optional_f', lang)}</span>
            </label>
            <input id="bannerUrl" type="url" value={bannerUrl}
              onChange={e => setBannerUrl(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">{t('boutique.image_url_hint', lang)}</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
            {saving ? t('common.saving', lang) : t('common.save', lang)}
          </button>
        </form>
      </div>
    </main>
  )
}
