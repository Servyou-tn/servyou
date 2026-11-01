'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PlatformLinkInput } from '@/components/social/PlatformLinkInput'
import { FOCUS_RING } from '@/components/layout/styles'
import { PROPOSAL_LINKS_MAX, PROPOSAL_LINK_LABEL_MAX } from '@/lib/job-constants'
import type { ProposalLinkInput } from '@/lib/marche/proposal-validation'

// « Liens vers vos réalisations (optionnel) » — Figma 356:12341 (+ specimens 356:12458 / 356:12519, read from the design notes):
// up to 3 rows of [label input (272) · URL input (fill)], each h 44; a secondary/sm « + Ajouter un lien » (h 32) with a
// « 1 / 3 » counter, disabled at 3.
//
// The address field has NO maxLength: a pasted address longer than the limit would be cut silently into a different link — the form measures the
// NORMALISED address (« https:// » added) and says « trop longue » instead. It is the kit's PlatformLinkInput (links kit PR-2): LTR, and the glyph of the platform typed. The row keeps its own label
// field and its cap of 3 — a proposal link is a work sample, not a profile link.
//
// D-H12-8: row 1 carries a transparent spacer where the delete button sits on rows 2-3, so the right edge is not ragged;
// the delete control has a ≥ 44 px hit area (the frame draws 32).
//
// Controlled: the parent owns the rows (a failed server action must not reset the form). Errors are i18n KEYS resolved by
// the caller's `tr`, index-aligned with the rows.
export function LinksField({
  rows,
  onChange,
  errors,
  disabled,
  texts,
}: {
  rows: ProposalLinkInput[]
  onChange: (next: ProposalLinkInput[]) => void
  errors?: (string | undefined)[]
  disabled?: boolean
  texts: {
    label: string
    helper: string
    labelPlaceholder: string
    urlPlaceholder: string
    labelAria: (n: number) => string
    urlAria: (n: number) => string
    add: string
    remove: (n: number) => string
    maxReached: string
    error: (key: string) => string
  }
}) {
  const atMax = rows.length >= PROPOSAL_LINKS_MAX

  function update(i: number, patch: Partial<ProposalLinkInput>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-medium text-text-secondary">{texts.label}</legend>
      <p className="text-caption text-text-muted">{texts.helper}</p>

      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[272px_minmax(0,1fr)]">
                <Input
                  aria-label={texts.labelAria(i + 1)}
                  placeholder={texts.labelPlaceholder}
                  maxLength={PROPOSAL_LINK_LABEL_MAX}
                  value={row.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
                <PlatformLinkInput
                  aria-label={texts.urlAria(i + 1)}
                  placeholder={texts.urlPlaceholder}
                  value={row.url}
                  error={errors?.[i] ? texts.error(errors[i] as string) : undefined}
                  onChange={(e) => update(i, { url: e.target.value })}
                />
              </div>
              {i === 0 ? (
                // Transparent spacer: same box as the delete button below, so every row ends at the same edge.
                <span aria-hidden="true" className="size-11 shrink-0" />
              ) : (
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                  aria-label={texts.remove(i + 1)}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-danger-500 ${FOCUS_RING}`}
                >
                  <Trash2 className="size-5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={atMax}
          iconStart={<Plus aria-hidden="true" />}
          onClick={() => onChange([...rows, { label: '', url: '' }])}
        >
          {texts.add}
        </Button>
        <span dir="ltr" className="text-caption text-text-muted">
          {rows.length} / {PROPOSAL_LINKS_MAX}
        </span>
      </div>
      {atMax ? <p className="text-caption text-text-muted">{texts.maxReached}</p> : null}
    </fieldset>
  )
}
