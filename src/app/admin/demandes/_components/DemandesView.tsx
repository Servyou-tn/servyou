import Link from 'next/link'
import type { ReactNode } from 'react'
import { FileCheck, TriangleAlert } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { ErrorState } from '@/components/marche/ErrorState'
import type { RequestTab } from '../_lib/view'

// J10 « Demandes » (Figma NOV 4 — Admin, 1440) + admin-m375-requests. Presentational: the page resolves every
// string. One card per request; the tab picks the kind (the 375 frame shows one kind per tab). Below lg the tab
// labels shorten (Comptes / Exports / Contact) and the card switches to the drawn mobile layout.

export type RequestCard = {
  id: string
  name: string
  initials: string
  /** « hela.bs@example.tn · Freelance · Sousse » (desktop) / « Freelance · Sousse » (375). */
  line: string
  lineMobile: string
  deadline: { label: string; labelMobile: string; overdue: boolean } | null
  pill: { status: StatusValue; label: string } | null
  when: string | null
  headline: string | null
  title: string | null
  quote: string | null
  body: string | null
  stats: Array<{ label: string; value: string }>
  statsMobile: string | null
  warning: string | null
  mailto: { href: string; labelKey: string; primary: boolean } | null
  /** Rendered before / after the e-mail link, in the frame's order (Supprimer · Contacter · Refuser). */
  actionsBefore: ReactNode
  actionsAfter: ReactNode
}
export type RequestTabView = { key: RequestTab; label: string; labelShort: string; href: string; active: boolean; count?: number }

const panel = 'flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6 max-lg:p-4'

export function DemandesView({
  lang,
  tabs,
  cards,
  failed,
  empty,
}: {
  lang: Lang
  tabs: RequestTabView[]
  cards: RequestCard[]
  failed: boolean
  empty: { titleKey: string; bodyKey: string }
}) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('admin.requests.title', lang)}</h1>
        <p className="hidden text-body-sm text-text-secondary lg:block">{t('admin.requests.subtitle', lang)}</p>
      </header>

      {/* Tabs — the AdminTabs recipe (h44, px16, gap 8, blue-600 indicator, 16 badge) with a short label below lg. */}
      <nav aria-label={t('admin.requests.tabs_aria', lang)} className="flex min-w-0 overflow-x-auto border-b border-border-subtle bg-surface-base [scrollbar-width:none]">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={tab.active ? 'page' : undefined}
            className={`${cn(
              'relative flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-4 transition-colors',
              tab.active ? 'font-semibold text-brand-blue-600' : 'font-medium text-text-muted hover:text-text-primary',
              FOCUS_RING,
            )} text-body`}
          >
            <span className="lg:hidden">{tab.labelShort}</span>
            <span className="hidden lg:inline">{tab.label}</span>
            {tab.count !== undefined ? (
              <span dir="ltr" className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-600 px-1 text-xs font-semibold text-white">{tab.count}</span>
            ) : null}
            {tab.active ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-blue-600" /> : null}
          </Link>
        ))}
      </nav>

      {failed ? (
        <ErrorState lang={lang} />
      ) : cards.length === 0 ? (
        // Empty — icon 24, title 14 Semi Bold, caption 12 muted, centred (the frame's « Aucune demande d'export »).
        <section className={`${panel} items-center py-8 text-center`}>
          <FileCheck className="size-6 text-text-muted" aria-hidden="true" />
          <p className="text-body-sm font-semibold text-text-primary">{t(empty.titleKey, lang)}</p>
          <p className="text-caption text-text-muted">{t(empty.bodyKey, lang)}</p>
        </section>
      ) : (
        <ul className="flex flex-col gap-6 max-lg:gap-4">
          {cards.map((c) => <li key={c.id}><Card lang={lang} c={c} /></li>)}
        </ul>
      )}
    </div>
  )
}

function Card({ lang, c }: { lang: Lang; c: RequestCard }) {
  const mail = c.mailto
    ? cn(BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE[c.mailto.primary ? 'primary' : 'secondary'], VARIANT_STATE[c.mailto.primary ? 'primary' : 'secondary'])
    : ''
  return (
    <article className={panel}>
      <div className="flex items-start gap-3">
        <Avatar size="sm" initials={c.initials} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{c.name}</bdi></p>
          <p className="truncate text-caption font-medium text-text-muted">
            <bdi className="hidden lg:inline">{c.line}</bdi>
            <bdi className="lg:hidden">{c.lineMobile}</bdi>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 max-lg:hidden">
          {c.deadline ? <StatusPill status={c.deadline.overdue ? 'annulée' : 'pending'}>{c.deadline.label}</StatusPill> : null}
          {c.pill ? <StatusPill status={c.pill.status}>{c.pill.label}</StatusPill> : null}
          {c.when ? <span className="text-caption font-medium text-text-muted">{c.when}</span> : null}
        </div>
      </div>
      {/* 375: the deadline pill drops under the name (« Il reste 31 h pour traiter »). */}
      {c.deadline || c.pill ? (
        <div className="flex flex-wrap items-center gap-2 lg:hidden">
          {c.deadline ? <StatusPill status={c.deadline.overdue ? 'annulée' : 'pending'}>{c.deadline.labelMobile}</StatusPill> : null}
          {c.pill ? <StatusPill status={c.pill.status}>{c.pill.label}</StatusPill> : null}
          {c.when ? <span className="text-caption font-medium text-text-muted">{c.when}</span> : null}
        </div>
      ) : null}
      {c.headline ? <p className="hidden text-body-sm text-text-secondary lg:block">{c.headline}</p> : null}
      {c.title ? <h2 className="text-body-lg font-semibold text-text-primary"><bdi>{c.title}</bdi></h2> : null}
      {c.quote ? (
        <p className="rounded-lg bg-surface-subtle px-4 py-3 text-body-sm text-text-primary max-lg:bg-transparent max-lg:p-0 max-lg:text-body">
          <bdi>« {c.quote} »</bdi>
        </p>
      ) : null}
      {c.body ? <p className="whitespace-pre-wrap text-body-sm text-text-secondary"><bdi>{c.body}</bdi></p> : null}
      {c.stats.length > 0 ? (
        <dl className="hidden flex-wrap gap-x-6 gap-y-2 lg:flex">
          {c.stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <dt className="text-caption font-medium uppercase text-text-muted">{s.label}</dt>
              <dd className="text-body-sm font-medium text-text-primary">{s.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {c.statsMobile ? <p className="text-caption font-medium text-text-muted lg:hidden">{c.statsMobile}</p> : null}
      {c.warning ? (
        <p className="flex items-start gap-2 rounded-lg bg-brand-indigo-50 px-4 py-2.5 text-caption font-medium text-brand-indigo-700">
          <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          <span>{c.warning}</span>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch max-sm:[&_button]:w-full">
        {c.actionsBefore}
        {c.mailto ? (
          <a href={c.mailto.href} className={`${mail} max-sm:w-full`}>{t(c.mailto.labelKey, lang)}</a>
        ) : null}
        {c.actionsAfter}
      </div>
    </article>
  )
}
