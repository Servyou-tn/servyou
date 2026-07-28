'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Search } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { buildSearchQuery } from '@/components/recherche/search-url'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SERVICE_STATUSES,
  ORDER_SORTS,
  type ServiceOrderStatus,
  type OrderSort,
} from '@/lib/marche/my-orders-params'
import { STATUS_PILL } from '@/lib/orders/order-status'
import { MENU_CONTENT, MENU_ITEM } from '@/components/ui/menu-styles'

// E3 filter bar — Figma filterBar 709:59669 (search 816 + Statut 148 + Trier par 148, gap 12)
// and the mobile selRow 710:59949 (two 168 selects under a full-width search).
//
// Every control writes to the URL and the server page re-fetches, exactly as
// /marche/services does it: the back button replays filter states and the URLs are
// bookmarkable. Search submits on Enter / blur rather than per-keystroke — a router.push per
// character would re-run the query on every letter.
//
// Controls are 40px, radius 10, border-strong, 16px inset (Figma). `rounded-[10px]` is
// deliberate: --radius-lg IS 10px in tokens.css but is not wired into @theme, so Tailwind's
// `rounded-lg` still resolves to its built-in 8px (logged radius follow-up).
//
// WIDTH IS CALL-SITE BEHAVIOUR, NOT A FIGMA VALUE. 709:59671 / 709:59672 are authored 148 wide
// against the PLACEHOLDER text ("Statut", "Trier par"); these triggers show the SELECTED value
// instead, and "Tous les statuts" needs ~112px on one line against the 90px a 148 control
// leaves after px-4 + the chevron + the gap. Pinned at 148 the label wrapped to two lines
// (measured 88×42 inside a 40px control) because nothing stopped it: a hug with no ceiling
// never truncates, since truncation needs a width to truncate against.
// Resolution, same as ServicesFilterBar: the label carries `truncate` (its `white-space:
// nowrap` is the part that actually prevents the wrap) + `min-w-0` so it can shrink inside the
// flex row, and the trigger hugs its content up to a ceiling. The ceiling is sized so every
// real label fits on one line and only pathological content truncates.
const TRIGGER =
  'inline-flex h-10 shrink-0 items-center justify-between gap-2 rounded-[10px] border border-border-strong bg-white px-4 text-body-sm transition-colors hover:border-text-muted'
// MENU_CONTENT / MENU_ITEM now live in components/ui/menu-styles — promoted at their third
// consumer (G8's sort select). Strings unchanged.

export function OrdersFilterBar({
  q,
  statut,
  tri,
  basePath,
}: {
  q: string
  statut: ServiceOrderStatus | 'all'
  tri: OrderSort
  basePath: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()
  const [term, setTerm] = useState(q)

  function push(patch: Record<string, string | null>) {
    const qs = buildSearchQuery(sp.toString(), patch, { resetPage: true })
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  const statusLabel =
    statut === 'all' ? t('mesCommandes.filter.allStatus', lang) : t(STATUS_PILL[statut].labelKey, lang)

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
      {/* Search — full width on mobile, grows on desktop (Figma 816 of 1136). */}
      <div
        className={`flex h-10 flex-1 items-center gap-2 rounded-[10px] border border-border-strong bg-white px-4 focus-within:border-brand-blue-600 focus-within:ring-2 focus-within:ring-brand-blue-600 focus-within:ring-offset-2 focus-within:ring-offset-surface-base`}
      >
        <Search className="h-[18px] w-[18px] shrink-0 text-text-muted" aria-hidden="true" />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onBlur={() => term !== q && push({ q: term || null })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              push({ q: term || null })
            }
          }}
          aria-label={t('mesCommandes.search', lang)}
          placeholder={t('mesCommandes.search', lang)}
          className="w-full min-w-0 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        {/* Statut */}
        <DropdownMenu>
          <DropdownMenuTrigger className={`${TRIGGER} ${FOCUS_RING} min-w-0 flex-1 lg:max-w-56 lg:flex-none`}>
            <span className={`min-w-0 truncate ${statut === 'all' ? 'text-text-muted' : 'text-text-primary'}`}>
              {statusLabel}
            </span>
            <ChevronDown className="h-[18px] w-[18px] shrink-0 text-text-muted" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={MENU_CONTENT}>
            <DropdownMenuRadioGroup
              value={statut}
              onValueChange={(v) => push({ statut: v === 'all' ? null : v })}
            >
              <DropdownMenuRadioItem value="all" className={MENU_ITEM}>
                {t('mesCommandes.filter.allStatus', lang)}
              </DropdownMenuRadioItem>
              {SERVICE_STATUSES.map((s) => (
                <DropdownMenuRadioItem key={s} value={s} className={MENU_ITEM}>
                  {t(STATUS_PILL[s].labelKey, lang)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Trier par */}
        <DropdownMenu>
          <DropdownMenuTrigger className={`${TRIGGER} ${FOCUS_RING} min-w-0 flex-1 lg:max-w-56 lg:flex-none`}>
            <span className="min-w-0 truncate text-text-primary">{t(`mesCommandes.sort.${tri}`, lang)}</span>
            <ChevronDown className="h-[18px] w-[18px] shrink-0 text-text-muted" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={MENU_CONTENT}>
            <DropdownMenuRadioGroup
              value={tri}
              onValueChange={(v) => push({ tri: v === 'recent' ? null : v })}
            >
              {ORDER_SORTS.map((s) => (
                <DropdownMenuRadioItem key={s} value={s} className={MENU_ITEM}>
                  {t(`mesCommandes.sort.${s}`, lang)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
