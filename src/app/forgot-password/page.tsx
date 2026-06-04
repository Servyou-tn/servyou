'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const lang = useLang()

  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✉️</div>
          <p className="text-gray-700">{t('auth.forgot_success', lang)}</p>
          <Link href="/login" className="block mt-6 text-sm text-blue-600 hover:underline">
            {t('auth.forgot_back', lang)}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('auth.forgot_title', lang)}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('auth.forgot_hint', lang)}</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              {t('login.email', lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
          >
            {loading ? t('common.submitting', lang) : t('auth.forgot_submit', lang)}
          </button>
        </form>

        <p className="text-sm text-center mt-6">
          <Link href="/login" className="text-blue-600 hover:underline">
            {t('auth.forgot_back', lang)}
          </Link>
        </p>
      </div>
    </main>
  )
}
