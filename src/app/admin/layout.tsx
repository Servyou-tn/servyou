'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { AdminSidebar } from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/connexion'); return }

      // Owner-read RLS lets a user read their own row, so this resolves the
      // caller's admin flag. The real authorization boundary is RLS/is_admin()
      // at the data layer; this client guard is convenience.
      const { data: profile, error } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).single()
      if (error) console.error('[admin/layout] profile is_admin fetch error:', error)
      if (!profile || !profile.is_admin) { router.replace('/'); return }

      setAuthorized(true)
      setLoading(false)
    }
    check()
  }, [])

  if (loading || !authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">{tr('common.loading')}</p>
      </main>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 md:flex-row">
      <AdminSidebar t={tr} />
      <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
    </div>
  )
}
