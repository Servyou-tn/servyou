'use client'

import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { AdminSidebar } from '@/components/AdminSidebar'

// The admin chrome, split out of layout.tsx so the layout can be a Server Component that runs
// requireAdmin before anything renders. AdminSidebar takes `t` as a function prop, which a Server
// Component cannot pass across the client boundary — so the translator is built here, client-side,
// exactly as the old client layout built it.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 md:flex-row">
      <AdminSidebar t={tr} />
      <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
    </div>
  )
}
