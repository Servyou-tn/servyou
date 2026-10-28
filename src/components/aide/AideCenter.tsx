'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  ChevronDown,
  FileCheck,
  Inbox,
  Layers,
  Megaphone,
  Package,
  Search,
  SearchX,
  Shield,
  ShoppingBag,
  Store,
  Truck,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { Input } from '@/components/ui/input'
import { FOCUS_RING } from '@/components/layout/styles'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { AideIcon } from '@/lib/aide/groups'
import { countAideItems, filterAideGroups, type AideGroupView } from '@/lib/aide/search'
import { SUPPORT_WHATSAPP_HREF } from './support'
import { WhatsAppGlyph } from './WhatsAppGlyph'

// /aide — the interactive half: the search, the accordion groups, the no-result state. Figma I-Aide
// 449:17900 (main) · 449:18312 (active search) · 449:18375 (no result) · AccordionGroup 449:17899.
// The contact panel is a SERVER component handed in as `rail` (static, nothing to filter).
//
// Search is client-side and instant over question + answer text (lib/aide/search.ts). Open/closed state is
// per question and survives filtering. The page ships ALL-COLLAPSED — a lookup page, not a read-through.

const ICONS: Record<AideIcon, LucideIcon> = {
  briefcase: Briefcase,
  layers: Layers,
  'file-check': FileCheck,
  search: Search,
  store: Store,
  package: Package,
  inbox: Inbox,
  truck: Truck,
  'shopping-bag': ShoppingBag,
  megaphone: Megaphone,
  shield: Shield,
  user: User,
}

export function AideCenter({
  groups,
  placeholder,
  rail,
}: {
  groups: AideGroupView[]
  placeholder: string
  rail: ReactNode
}) {
  const lang = useLang()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())

  const trimmed = query.trim()
  const visible = filterAideGroups(groups, query)
  const matches = countAideItems(visible)
  const searching = trimmed !== ''
  const noResult = searching && matches === 0

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // One live region for the whole search block: the static hint while idle, the count while filtering.
  // Empty when nothing matches — the no-result state below announces itself (role=status) and Figma 449:18375
  // shows no « 0 questions » line above it.
  const caption = !searching
    ? t('aide.search.hint', lang)
    : noResult
      ? ''
      : matches === 1
        ? t('aide.search.countOne', lang, { q: trimmed })
        : t('aide.search.countMany', lang, { n: matches, q: trimmed })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label={t('aide.search.label', lang)}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          iconStart={<Search className="size-[18px] text-text-muted" aria-hidden="true" />}
          iconEnd={
            searching ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('aide.search.clear', lang)}
                className={cn('rounded text-text-muted hover:text-text-secondary', FOCUS_RING)}
              >
                <X className="size-[18px]" aria-hidden="true" />
              </button>
            ) : undefined
          }
        />
        <p
          aria-live="polite"
          className={searching ? 'text-body-sm text-text-secondary' : 'text-caption font-medium text-text-muted'}
        >
          {caption}
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {noResult ? (
            <NoResult query={trimmed} />
          ) : (
            visible.map((group) => (
              <AccordionGroup key={group.id} group={group} open={open} onToggle={toggle} />
            ))
          )}
        </div>
        <div className="w-full shrink-0 lg:sticky lg:top-[88px] lg:w-[368px]">{rail}</div>
      </div>
    </div>
  )
}

function AccordionGroup({
  group,
  open,
  onToggle,
}: {
  group: AideGroupView
  open: ReadonlySet<string>
  onToggle: (id: string) => void
}) {
  const Icon = ICONS[group.icon]
  const headingId = `aide-g-${group.id}`

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Icon className="size-5 shrink-0 text-text-primary" aria-hidden="true" />
        <h2 id={headingId} className="text-xl font-semibold text-text-primary">
          {group.title}
        </h2>
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-600 px-1 text-caption font-semibold leading-4 text-text-inverse">
          {group.items.length}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {group.items.map((item) => (
          <AccordionItem key={item.id} item={item} expanded={open.has(item.id)} onToggle={() => onToggle(item.id)} />
        ))}
      </div>
    </section>
  )
}

function AccordionItem({
  item,
  expanded,
  onToggle,
}: {
  item: { id: string; q: string; a: string }
  expanded: boolean
  onToggle: () => void
}) {
  const buttonId = `aide-q-${item.id}`
  const panelId = `aide-a-${item.id}`

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-base">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            'flex w-full items-center justify-between gap-4 rounded-lg px-6 py-5 text-start text-base font-semibold text-text-primary',
            FOCUS_RING,
          )}
        >
          <span>{item.q}</span>
          <ChevronDown
            className={cn('size-5 shrink-0 text-text-muted transition-transform motion-reduce:transition-none', expanded && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!expanded}
        className="whitespace-pre-line px-6 pb-6 text-base text-text-secondary"
      >
        {item.a}
      </div>
    </div>
  )
}

// 449:18375 — Empty State r16 (440 wide, 112px sunken circle + 64px glyph, 20/Semi Bold title, 16 body) with
// the WhatsApp CTA: an unanswered question is exactly what support wants to hear about.
function NoResult({ query }: { query: string }) {
  const lang = useLang()
  return (
    <div className="flex justify-center py-4">
      <div
        role="status"
        className="flex w-full max-w-[440px] flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-surface-base px-6 py-10 text-center sm:px-10 sm:py-12"
      >
        <div className="flex size-28 shrink-0 items-center justify-center rounded-full bg-surface-sunken" aria-hidden="true">
          <SearchX size={64} strokeWidth={2} absoluteStrokeWidth className="text-text-muted" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">{t('aide.empty.title', lang, { q: query })}</h2>
        <p className="text-base text-text-muted">{t('aide.empty.body', lang)}</p>
        <Link
          href={SUPPORT_WHATSAPP_HREF}
          className={cn(
            'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-wa-brand px-5 text-base font-semibold text-text-primary transition-colors hover:bg-wa-brand-hover motion-reduce:transition-none',
            FOCUS_RING,
          )}
        >
          <WhatsAppGlyph />
          {t('aide.contact.whatsapp', lang)}
        </Link>
      </div>
    </div>
  )
}
