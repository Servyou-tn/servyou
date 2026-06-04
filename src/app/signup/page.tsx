'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
  'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
  'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
]

function getAge(dateOfBirth: string): number {
  const today = new Date()
  const dob = new Date(dateOfBirth)
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function translateError(message: string, lang: ReturnType<typeof useLang>): string {
  if (message.includes('User already registered') || message.includes('already been registered')) {
    return t('signup.error_email_exists', lang)
  }
  if (message.includes('Invalid email')) return t('signup.error_invalid_email', lang)
  if (message.includes('Password should be at least')) return t('signup.error_password_len', lang)
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return t('common.rate_limit', lang)
  }
  return t('common.error_generic', lang)
}

export default function SignupPage() {
  const supabase = createClient()
  const lang = useLang()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [city, setCity] = useState('')
  const [language, setLanguage] = useState('fr')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!fullName || !email || !password || !dateOfBirth || !city) {
      setError(t('signup.error_all_fields', lang))
      return
    }
    if (password.length < 8) {
      setError(t('signup.error_password_len', lang))
      return
    }
    if (getAge(dateOfBirth) < 16) {
      setError(t('signup.error_min_age', lang))
      return
    }

    setLoading(true)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, date_of_birth: dateOfBirth, city, language },
      },
    })
    setLoading(false)

    if (signUpError) {
      setError(translateError(signUpError.message, lang))
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">{t('signup.success_title', lang)}</h1>
          <p className="text-gray-600">
            {t('signup.success_prefix', lang)}<span className="font-medium">{email}</span>{t('signup.success_suffix', lang)}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('signup.title', lang)}</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fullName">
              {t('signup.full_name', lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName" type="text" required value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              {t('signup.email', lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="email" type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              {t('signup.password', lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="password" type="password" required minLength={8} value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">{t('signup.password_hint', lang)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="dateOfBirth">
              {t('signup.date_of_birth', lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="dateOfBirth" type="date" required value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="city">
              {t('signup.city', lang)} <span className="text-red-500">*</span>
            </label>
            <select
              id="city" required value={city}
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
              id="language" value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="fr">{t('signup.lang_fr', lang)}</option>
              <option value="ar">{t('signup.lang_ar', lang)}</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
          >
            {loading ? t('signup.submitting', lang) : t('signup.submit', lang)}
          </button>
        </form>
      </div>
    </main>
  )
}
