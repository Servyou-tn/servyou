'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

function translateError(message: string, lang: ReturnType<typeof useLang>): string {
  if (message.includes('Password should be at least')) return t('signup.error_password_len', lang)
  if (message.includes('Auth session missing') || message.includes('session_not_found')) {
    return t('auth.error_expired_link', lang)
  }
  return t('common.error_generic', lang)
}

export default function UpdatePasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(t('signup.error_password_len', lang))
      return
    }
    if (password !== confirm) {
      setError(t('auth.error_mismatch', lang))
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(translateError(updateError.message, lang))
      return
    }

    router.push('/login')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('auth.new_password_title', lang)}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('auth.new_password_hint', lang)}</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              {t('auth.new_password_field', lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">{t('signup.password_hint', lang)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirm">
              {t('auth.confirm_field', lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
            {loading ? t('common.saving', lang) : t('auth.new_password_submit', lang)}
          </button>
        </form>
      </div>
    </main>
  )
}
