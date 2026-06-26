'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, Inbox, Send, Bookmark, User, Package, Heart, Folder, type LucideIcon } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { CARD_SHADOW } from '@/components/layout/styles'
import { interactiveSurface } from '@/components/ui/interactive-surface'

type NavItem = { key: string; href: string; Icon: LucideIcon; match: (p: string) => boolean }

// The freelancer workspace sidebar — same floating white card / rounded-full interactiveSurface()
// pills / brand-accent active tint + focus ring as MarcheSidebar, differing ONLY in its items.
//
// STRUCTURE (LOCKED, PR-F2.3.2 — Servyou's Unified Sidebar Principle): two groups under a divider,
// each with a section heading. Top = the role-specific freelancer workspace; bottom = the universal
// personal (consumer) workspace, because every freelancer is also a buyer. This supersedes F2.3.1's
// move of the consumer items into the avatar dropdown — founder-directed. Future PRs add the page
// CONTENT behind these routes; they do NOT change this navigation.
//
// Active matching is per-item (NOT longest-prefix): "Tableau de bord" is the freelancer's home (it
// lights up on the dashboard + the profile create/edit pages); each deeper section owns its subtree.
// Routes /commandes, /reponses and /profil-public 404/placeholder until their pages ship — the items
// still navigate and light up once they land.
const WORKSPACE_ITEMS: NavItem[] = [
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
    // Label "Mes propositions" (Upwork's "Proposals"); route + key stay /reponses / .responses.
    key: 'sidebar.freelance.responses',
    href: '/mon-profil-freelance/reponses',
    Icon: Send,
    match: (p) => p.startsWith('/mon-profil-freelance/reponses'),
  },
  {
    key: 'sidebar.freelance.saved',
    href: '/mon-profil-freelance/missions-sauvegardees',
    Icon: Bookmark,
    match: (p) => p.startsWith('/mon-profil-freelance/missions-sauvegardees'),
  },
  {
    // Route ships in a later PR — 404 until then (expected).
    key: 'sidebar.freelance.public_profile',
    href: '/mon-profil-freelance/profil-public',
    Icon: User,
    match: (p) => p.startsWith('/mon-profil-freelance/profil-public'),
  },
]

// The universal personal (consumer) workspace — every freelancer is also a buyer. REUSES
// MarcheSidebar's account keys + routes (single source of truth). Match = exact-or-subtree.
const PERSONAL_ITEMS: NavItem[] = [
  {
    key: 'marche.sidebar.commandes',
    href: '/mes-commandes',
    Icon: Package,
    match: (p) => p === '/mes-commandes' || p.startsWith('/mes-commandes/'),
  },
  {
    key: 'marche.sidebar.favoris',
    href: '/mes-favoris',
    Icon: Heart,
    match: (p) => p === '/mes-favoris' || p.startsWith('/mes-favoris/'),
  },
  {
    key: 'marche.sidebar.missions',
    href: '/mes-missions',
    Icon: Folder,
    match: (p) => p === '/mes-missions' || p.startsWith('/mes-missions/'),
  },
]

// Same pill layout as MarcheSidebar: shape + padding + text. The surface (height, idle/hover/
// active treatment, focus ring) comes from the shared interactiveSurface() — one source of truth.
const NAV_LAYOUT = 'flex items-center gap-2 rounded-full px-4 text-sm font-medium'
// Section heading: small muted uppercase label, aligned with the item label text. Display-only —
// it labels its group via role="group" + aria-labelledby (SR users get the grouping without it
// being announced as a control). text-start (default) keeps it logical for RTL.
const HEADING = 'px-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted'

export function FreelancerSidebar() {
  const lang = useLang()
  const pathname = usePathname()

  const renderItem = (item: NavItem) => {
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
  }

  return (
    <aside className="sticky top-[var(--marche-topbar-h,4.5rem)] hidden h-[calc(100vh_-_var(--marche-topbar-h,4.5rem))] shrink-0 self-start px-4 pb-4 pt-4 lg:block">
      <div className={`outline-brand flex h-full w-56 flex-col overflow-hidden rounded-3xl bg-white ${CARD_SHADOW}`}>
        <nav
          aria-label={t('nav.aria_primary', lang)}
          className="flex flex-1 flex-col overflow-y-auto px-3 pb-4 pt-4"
        >
          {/* Group 1 — freelancer workspace (role-specific) */}
          <div role="group" aria-labelledby="fl-sidebar-workspace" className="flex flex-col gap-2">
            <p id="fl-sidebar-workspace" className={HEADING}>
              {t('sidebar.freelance.workspace_section', lang)}
            </p>
            {WORKSPACE_ITEMS.map(renderItem)}
          </div>

          <hr aria-hidden="true" className="my-3 h-px border-0 bg-border-subtle" />

          {/* Group 2 — universal personal (consumer) workspace */}
          <div role="group" aria-labelledby="fl-sidebar-personal" className="flex flex-col gap-2">
            <p id="fl-sidebar-personal" className={HEADING}>
              {t('sidebar.freelance.personal_section', lang)}
            </p>
            {PERSONAL_ITEMS.map(renderItem)}
          </div>
        </nav>
      </div>
    </aside>
  )
}
