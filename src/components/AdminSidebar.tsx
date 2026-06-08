'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  t: (key: string) => string
}

// Admin sidebar nav. Overview is wired; the other five sections are visible
// but muted ("Bientôt") until PR-I2..I6 build them out. Vertical sidebar on
// md+; a horizontal scrollable bar on mobile (no hamburger state needed —
// function-first; design system elevates later).
export function AdminSidebar({ t }: Props) {
  const pathname = usePathname()

  const items: { key: string; href?: string }[] = [
    { key: 'admin.nav.overview', href: '/admin' },
    { key: 'admin.nav.users', href: '/admin/utilisateurs' },
    { key: 'admin.nav.content' },
    { key: 'admin.nav.reports', href: '/admin/signalements' },
    { key: 'admin.nav.disputes' },
    { key: 'admin.nav.statistics', href: '/admin/statistiques' },
  ]

  return (
    <aside className="bg-white border-b border-gray-200 md:w-60 md:shrink-0 md:border-b-0 md:border-e md:min-h-screen">
      <div className="px-4 py-4">
        <span className="text-lg font-bold text-gray-800">Servyou Admin</span>
      </div>
      <nav className="flex flex-row gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:pb-4">
        {items.map(item => {
          const label = t(item.key)
          if (item.href) {
            // Overview matches its exact path only (every admin route starts with
            // /admin); section links also highlight on their nested detail pages.
            const active = item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap rounded px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            )
          }
          return (
            <div
              key={item.key}
              aria-disabled="true"
              className="flex items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-sm font-medium text-gray-400"
            >
              {label}
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                {t('admin.nav.coming_soon')}
              </span>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
