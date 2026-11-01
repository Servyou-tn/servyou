'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { PlatformLinkInput } from './PlatformLinkInput'
import { RecommendedPlatforms } from './RecommendedPlatforms'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { LINKS_MAX, PLATFORMS, detectPlatform, normalizeUrl, platformName, type PlatformId } from '@/lib/social/platforms'
import { t, type Lang } from '@/lib/i18n'

// The freelancer's links editor (H3 « Confiance & liens »): up to 5, the suggested platforms for their trade first as « + LinkedIn » buttons, then
// « Autre plateforme » for anything else, a « 2/5 » counter. There is NO free label field: a link's name is its platform (derived at save from the
// address — `linkRowsToPayload`). Rows only; saving (delete + re-insert) stays the caller's.
export type LinkRow = {
  id: string
  url: string
  /** The platform a « + LinkedIn » button pre-set this row to — only its glyph / name while the address is still EMPTY; null for « Autre plateforme » / saved rows. */
  hint: PlatformId | null
}

/** What a row is: its typed address decides (a hint never names an address that is not that platform); the hint only speaks for an empty row. */
const rowPlatform = (r: LinkRow): PlatformId | null => (r.url.trim() === '' ? r.hint : detectPlatform(r.url))

/** What the form submits: non-empty addresses only, each named after its platform (`Site web` for any other site). */
export function linkRowsToPayload(rows: readonly LinkRow[]): { label: string; url: string }[] {
  return rows
    .map((r) => normalizeUrl(r.url))
    .filter((url) => url !== '')
    .map((url) => ({ label: PLATFORMS[detectPlatform(url) ?? 'website'].labelFr, url }))
}

/** Platforms already on the list — typed addresses count by what they ARE, empty pre-set rows by what they were set to. */
export function takenPlatforms(rows: readonly LinkRow[]): Set<PlatformId> {
  const taken = new Set<PlatformId>()
  for (const r of rows) {
    const p = rowPlatform(r)
    if (p) taken.add(p)
  }
  return taken
}

export function LinksEditor({
  rows,
  onChange,
  recommended,
  lang,
  errors,
}: {
  rows: LinkRow[]
  onChange: (next: LinkRow[]) => void
  /** The suggested platforms for the freelancer's trade, in order (lib/social/platforms `recommendedFor`). */
  recommended: readonly PlatformId[]
  lang: Lang
  /** Per-row address error, keyed by row id. */
  errors?: Record<string, string>
}) {
  const full = rows.length >= LINKS_MAX
  const taken = takenPlatforms(rows)
  const offered = recommended.filter((id) => !taken.has(id))

  // Focus follows the action: a new row's address field takes it on add; on remove it goes to the row that took the place (or the editor's own box
  // when none is left) — the removed button is unmounted, which would drop focus to <body>.
  const root = React.useRef<HTMLDivElement>(null)
  const pendingFocus = React.useRef<{ id: string } | { index: number } | null>(null)
  React.useEffect(() => {
    const want = pendingFocus.current
    if (!want) return
    pendingFocus.current = null
    const inputs = root.current?.querySelectorAll<HTMLInputElement>('input[data-link-row]')
    const target =
      'id' in want
        ? root.current?.querySelector<HTMLInputElement>(`input[data-link-row="${want.id}"]`)
        : inputs?.[Math.min(want.index, (inputs?.length ?? 1) - 1)]
    ;(target ?? root.current)?.focus()
  }, [rows])

  const add = (hint: PlatformId | null) => {
    if (full) return
    const id = crypto.randomUUID()
    pendingFocus.current = { id }
    onChange([...rows, { id, url: '', hint }])
  }
  const update = (id: string, url: string) => onChange(rows.map((r) => (r.id === id ? { ...r, url } : r)))
  const remove = (id: string) => {
    pendingFocus.current = { index: rows.findIndex((r) => r.id === id) }
    onChange(rows.filter((r) => r.id !== id))
  }

  return (
    <div ref={root} tabIndex={-1} className="flex flex-col gap-3 outline-none">
      <p className="text-sm text-text-muted">{t('links.editor.helper', lang, { max: LINKS_MAX })}</p>

      {rows.map((row, i) => {
        const platform = rowPlatform(row)
        const name = platform ? platformName(platform, lang === 'ar' ? 'ar' : 'fr') : t('links.editor.other', lang)
        return (
          <div key={row.id} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <PlatformLinkInput
                hint={row.hint}
                value={row.url}
                data-link-row={row.id}
                onChange={(e) => update(row.id, e.target.value)}
                aria-label={t('links.editor.url_aria', lang, { index: String(i + 1), platform: name })}
                placeholder={row.hint ? PLATFORMS[row.hint].example : 'https://…'}
                error={errors?.[row.id]}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(row.id)}
              aria-label={t('freelance.edit.remove_link', lang, { index: String(i + 1) })}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-subtle hover:text-danger-500',
                FOCUS_RING,
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )
      })}

      {!full && (
        <div className="flex flex-col gap-2">
          <RecommendedPlatforms platforms={offered} onPick={add} lang={lang} />
          <div>
            <Button variant="ghost" size="sm" className="max-sm:min-h-11" onClick={() => add(null)}>
              {t('links.editor.other', lang)}
            </Button>
          </div>
        </div>
      )}

      {/* role=status: the count is announced when a link is added or removed. self-start: the start edge of the page, in RTL too. */}
      <span role="status" className="self-start text-sm tabular-nums text-text-muted" dir="ltr">
        {rows.length}/{LINKS_MAX}
      </span>
    </div>
  )
}
