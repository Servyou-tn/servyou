'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Fragment, type Ref } from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  TriangleAlert,
  Shield,
  Eye,
  Users,
  Package,
  Inbox,
  FileText,
  Settings,
  HelpCircle,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t, tn } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { SidebarSection } from '@/components/shell/SidebarSection'

// The admin sidebar — Figma « NOV 4 — Admin » (J5/J6 « Sidebar — admin »): the seller shell's navy
// column (240 wide, blue-950, logo band 72) with the admin IA. The frame draws PILOTAGE / MODÉRATION /
// OPÉRATIONS by hand (caption 41 tall, rows 45, gap 4) and OUTILS & COMPTE from the shell components
// (SidebarSection reused unchanged, rows 44). Rows copy SidebarItem's recipe (radius 10, 20px icon,
// blue-300 idle icon, blue-600 active fill) plus the frame's red count pill, which the shared row has no
// slot for. Links whose page is not built yet render muted and non-navigable (the shell's « Bientôt »
// treatment). Counts come from the layout; a count with no source — or a failed read — is `undefined`
// and renders no pill, never a fake 0.

export type AdminCounts = { reports?: number; disputes?: number }

type CountKey = keyof AdminCounts
type NavItem = { key: string; href: string; icon: LucideIcon; disabled?: boolean; count?: CountKey }
type NavSection = { labelKey: string; items: NavItem[] }

const TOP_SECTIONS: NavSection[] = [
  {
    labelKey: 'admin.nav.section.pilotage',
    items: [
      { key: 'admin.nav.overview', href: '/admin', icon: LayoutDashboard },
      { key: 'admin.nav.statistics', href: '/admin/statistiques', icon: TrendingUp },
    ],
  },
  {
    labelKey: 'admin.nav.section.moderation',
    items: [
      { key: 'admin.nav.reports', href: '/admin/signalements', icon: TriangleAlert, count: 'reports' },
      { key: 'admin.nav.disputes', href: '/admin/litiges', icon: Shield, count: 'disputes' },
      { key: 'admin.nav.content', href: '/admin/contenu', icon: Eye },
      { key: 'admin.nav.users', href: '/admin/utilisateurs', icon: Users },
    ],
  },
  {
    labelKey: 'admin.nav.section.operations',
    items: [
      { key: 'admin.nav.orders', href: '/admin/commandes', icon: Package, disabled: true },
      { key: 'admin.nav.requests', href: '/admin/demandes', icon: Inbox, disabled: true },
      { key: 'admin.nav.journal', href: '/admin/journal', icon: FileText, disabled: true },
    ],
  },
]

const ACCOUNT_SECTION: NavSection = {
  labelKey: 'shell.sidebar.section.tools',
  items: [
    { key: 'shell.sidebar.settings', href: '/parametres', icon: Settings },
    { key: 'shell.sidebar.help', href: '/aide', icon: HelpCircle },
  ],
}

// Vue d'ensemble matches /admin exactly (every admin route starts with it); the others also light on
// their nested detail pages.
function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export function AdminSidebar({
  counts,
  inDrawer = false,
  onNavigate,
  onClose,
  closeRef,
}: {
  counts: AdminCounts
  inDrawer?: boolean
  onNavigate?: () => void
  onClose?: () => void
  closeRef?: Ref<HTMLButtonElement>
}) {
  const lang = useLang()
  const pathname = usePathname()

  const renderRow = (item: NavItem, framed: boolean) => {
    const count = item.count ? counts[item.count] : undefined
    return (
      <AdminNavRow
        key={item.href}
        item={item}
        framed={framed}
        label={t(item.key, lang)}
        active={!item.disabled && isActive(pathname, item.href)}
        count={count}
        countLabel={count ? tn('admin.nav.pending_count', lang, count) : undefined}
        soonLabel={t('shell.sidebar.soon', lang)}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-brand-blue-950 px-4 pb-6 text-text-inverse">
      {/* Logo band — 72 tall, start-pad 12 (S-mark band 208×72 → Lockup 123×32, gap 8). */}
      <div className="flex h-[72px] shrink-0 items-center justify-between ps-3">
        <Link href="/admin" onClick={onNavigate} aria-label="Servyou" className={cn('flex items-center gap-2 rounded-pill', FOCUS_RING)}>
          <Image src="/brand/logo/servyou-s-mark.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0" />
          <span className="text-xl font-bold text-white">ServYou</span>
        </Link>
        {inDrawer ? (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('shell.mobile.menu.close', lang)}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-pill text-white/70 transition-colors hover:bg-white/5 hover:text-white',
              FOCUS_RING,
            )}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav
        aria-label={t('admin.nav.aria', lang)}
        className="mt-3 flex flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* « Top » (Figma J5/J6): the three admin sections are drawn by hand in the frame — caption pad
            16/12/8 (41 tall), rows pad 12 (45 tall, gap 12), every sibling 4 apart. Measured, not the
            shell's component spacing, so they are built here as drawn. */}
        <div className="flex flex-col gap-1">
          {TOP_SECTIONS.map((section) => (
            <Fragment key={section.labelKey}>
              <p className="px-3 pb-2 pt-4 text-section-cap font-medium uppercase tracking-[0.06em] text-brand-blue-300">
                {t(section.labelKey, lang)}
              </p>
              {section.items.map((item) => renderRow(item, true))}
            </Fragment>
          ))}
        </div>
        {/* spacer 2, then « Account » — the shell's Section Label + Nav Item components (32 / 44, gap 2). */}
        <div aria-hidden="true" className="h-0.5 shrink-0" />
        <SidebarSection label={t(ACCOUNT_SECTION.labelKey, lang)}>
          {ACCOUNT_SECTION.items.map((item) => renderRow(item, false))}
        </SidebarSection>
      </nav>
    </div>
  )
}

function AdminNavRow({
  item,
  framed,
  label,
  active,
  count,
  countLabel,
  soonLabel,
  onNavigate,
}: {
  item: NavItem
  /** true = the frame's hand-drawn row (pad 12 → 45 tall, gap 12); false = the shell component (44, gap 10). */
  framed: boolean
  label: string
  active: boolean
  count?: number
  countLabel?: string
  soonLabel: string
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const content = (
    <>
      <Icon
        className={cn('h-5 w-5 shrink-0', !active && !item.disabled && 'text-brand-blue-300', item.disabled && 'text-brand-blue-300/50')}
        aria-hidden="true"
      />
      {/* text-body-sm is appended outside cn() (twMerge evicts it next to a text colour); the weight
          class still wins because font-* utilities sort after the text-* token in the stylesheet. */}
      <span className={`${cn('min-w-0 flex-1 truncate', active ? 'font-semibold' : 'font-medium', item.disabled && 'text-white/50')} text-body-sm`}>
        {label}
      </span>
      {count ? (
        // Count pill (Figma « count »): danger-500, radius full, pad 1/6, 12 Semi Bold white. The digits
        // are LTR in both languages; the sr-only text says what the number counts.
        <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-danger-500 px-1.5 py-px text-xs font-semibold text-white">
          <span aria-hidden="true" dir="ltr">{count}</span>
          <span className="sr-only">{countLabel}</span>
        </span>
      ) : null}
    </>
  )
  const base = cn('flex items-center rounded-[10px] px-3 transition-colors', framed ? 'gap-3 py-3' : 'h-11 gap-2.5')

  if (item.disabled) {
    return (
      <span aria-disabled="true" title={soonLabel} className={cn(base, 'cursor-not-allowed text-white')}>
        {content}
      </span>
    )
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(base, active ? 'bg-brand-blue-600 text-white' : 'text-white hover:bg-white/5', FOCUS_RING)}
    >
      {content}
    </Link>
  )
}
