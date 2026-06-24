'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutDashboard, Briefcase, Inbox, MessageSquare, Bookmark, type LucideIcon } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { CARD_SHADOW } from '@/components/layout/styles'
import { interactiveSurface } from '@/components/ui/interactive-surface'

// The freelancer workspace sidebar — visually identical to MarcheSidebar (the same floating
// full-height white card, the same rounded-full interactiveSurface() pills, the same brand-accent
// active tint + focus ring), differing ONLY in its items. There are no filter panels here, so
// every item is a plain navigating pill — much simpler than MarcheSidebar's expandable machinery.
//
// Active matching is per-item (NOT longest-prefix). "Accueil" → / matches the home route exactly;
// "Dashboard" lights up on the dashboard AND the profile create/edit pages; each deeper section
// owns its own subtree. 4 of the 6 destinations (services / commandes / reponses /
// missions-sauvegardees) ship in later PRs (F1.2+ / F2) — they navigate now and light up once
// their pages land; the items are locked by the Freelancer Design Constitution.
const ITEMS: { key: string; href: string; Icon: LucideIcon; match: (p: string) => boolean }[] = [
  {
    key: 'sidebar.freelance.home',
    href: '/',
    Icon: Home,
    match: (p) => p === '/',
  },
  {
    key: 'sidebar.freelance.dashboard',
    href: '/mon-profil-freelance',
    Icon: LayoutDashboard,
    match: (p) =>
      p === '/mon-profil-freelance' ||
      p.startsWith('/mon-profil-freelance/creer') ||
      p.startsWith('/mon-profil-freelance/modifier'),
  },
  {
    key: 'sidebar.freelance.services',
    href: '/mon-profil-freelance/services',
    Icon: Briefcase,
    match: (p) => p.startsWith('/mon-profil-freelance/services'),
  },
  {
    key: 'sidebar.freelance.requests',
    href: '/mon-profil-freelance/commandes',
    Icon: Inbox,
    match: (p) => p.startsWith('/mon-profil-freelance/commandes'),
  },
  {
    key: 'sidebar.freelance.responses',
    href: '/mon-profil-freelance/reponses',
    Icon: MessageSquare,
    match: (p) => p.startsWith('/mon-profil-freelance/reponses'),
  },
  {
    key: 'sidebar.freelance.saved',
    href: '/mon-profil-freelance/missions-sauvegardees',
    Icon: Bookmark,
    match: (p) => p.startsWith('/mon-profil-freelance/missions-sauvegardees'),
  },
]

// Same pill layout as MarcheSidebar: shape + padding + text. The surface (height, idle/hover/
// active treatment, focus ring) comes from the shared interactiveSurface() — one source of truth.
const NAV_LAYOUT = 'flex items-center gap-2 rounded-full px-4 text-sm font-medium'

export function FreelancerSidebar() {
  const lang = useLang()
  const pathname = usePathname()

  return (
    <aside className="sticky top-[var(--marche-topbar-h,4.5rem)] hidden h-[calc(100vh_-_var(--marche-topbar-h,4.5rem))] shrink-0 self-start px-4 pb-4 pt-4 lg:block">
      <div className={`outline-brand flex h-full w-56 flex-col overflow-hidden rounded-3xl bg-white ${CARD_SHADOW}`}>
        <nav
          aria-label={t('nav.aria_primary', lang)}
          className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4 pt-4"
        >
          {ITEMS.map((item) => {
            const active = item.match(pathname)
            const Icon = item.Icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(NAV_LAYOUT, interactiveSurface(active))}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{t(item.key, lang)}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
