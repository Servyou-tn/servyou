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

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [language, setLanguage] = useState('fr')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, city, language, phone')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name ?? '')
        setCity(profile.city ?? '')
        setLanguage(profile.language ?? 'fr')
        setPhone(profile.phone ?? '')
      }

      setLoading(false)
    }

    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, city, language, phone: phone || null })
      .eq('id', user.id)

    setSaving(false)

    if (updateError) {
      setError(t('profile.error_save', lang))
      return
    }

    setSuccess(true)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">{t('common.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('profile.title', lang)}</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fullName">
              {t('signup.full_name', lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="city">
              {t('signup.city', lang)} <span className="text-red-500">*</span>
            </label>
            <select
              id="city"
              required
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t('signup.city_placeholder', lang)}</option>
              {GOVERNORATES.map(gov => (
                <option key={gov} value={gov}>{gov}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="language">
              {t('signup.language', lang)}
            </label>
            <select
              id="language"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="fr">{t('signup.lang_fr', lang)}</option>
              <option value="ar">{t('signup.lang_ar', lang)}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
              {t('profile.phone', lang)} <span className="text-gray-400 font-normal">{t('common.optional_m', lang)}</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              {t('profile.success', lang)}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
          >
            {saving ? t('common.saving', lang) : t('common.save_short', lang)}
          </button>
        </form>
      </div>
    </main>
  )
}
