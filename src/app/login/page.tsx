'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { SuspendedBanner } from './SuspendedBanner'

function translateError(message: string, lang: ReturnType<typeof useLang>): string {
  if (message.includes('Email not confirmed')) return t('login.error_not_confirmed', lang)
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
    return t('login.error_invalid_credentials', lang)
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return t('common.rate_limit', lang)
  }
  return t('common.error_generic', lang)
}

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInError) {
      setError(translateError(signInError.message, lang))
      return
    }

    router.push('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('login.title', lang)}</h1>

        <Suspense fallback={null}>
          <SuspendedBanner />
        </Suspense>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              {t('login.password', lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            {loading ? t('login.submitting', lang) : t('login.submit', lang)}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-center">
          <p>
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              {t('login.forgot_password', lang)}
            </Link>
          </p>
          <p className="text-gray-500">
            {t('login.no_account', lang)}{' '}
            <Link href="/signup" className="text-blue-600 hover:underline">
              {t('login.create_account', lang)}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
