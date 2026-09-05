'use client'

import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Sticky footer — 408:14113/408:14810, screenshot-confirmed twice (empty + validation states).
// Three buttons: Prévisualiser (link) / Enregistrer (secondary) / Publier mon profil (primary,
// visibly disabled + tooltip "Complétez les champs requis pour publier" while `canPublish` is
// false — matches the measured empty-state specimen exactly, not a click-then-error pattern).
// Left status dot: orange + "Modifications non enregistrées" while dirty, green + "Modifications
// enregistrées" once saved — independent of publish-readiness (the empty-state specimen shows
// clean+disabled together).
export function StickyFooter({
  lang,
  dirty,
  saving,
  publishing,
  canPublish,
  previewHref,
  onSave,
  onPublish,
}: {
  lang: Lang
  dirty: boolean
  saving: boolean
  publishing: boolean
  canPublish: boolean
  previewHref: string
  onSave: () => void
  onPublish: () => void
}) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border-subtle bg-surface-base px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className={cn('h-2 w-2 shrink-0 rounded-full', dirty ? 'bg-warning-500' : 'bg-success-500')}
        />
        <span role="status" className="text-text-muted">
          {t(dirty ? 'freelance.edit.footer_dirty' : 'freelance.edit.footer_clean', lang)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {/* Button never renders anything but a real <button> (no asChild) — a plain <a> styled to
            match its own 'link' variant classes (text-brand-blue-600, hover:underline) is the
            correct way to get a navigating, button-shaped link here. */}
        <a
          href={previewHref}
          target="_blank"
          rel="noreferrer"
          className={cn('inline-flex h-10 items-center px-2 text-base font-medium text-brand-blue-600 hover:underline', FOCUS_RING)}
        >
          {t('freelance.edit.preview', lang)}
        </a>
        <Button variant="secondary" size="md" loading={saving} onClick={onSave}>
          {t('freelance.edit.save', lang)}
        </Button>
        <span title={canPublish ? undefined : t('freelance.edit.publish_disabled_tooltip', lang)}>
          <Button variant="primary" size="md" loading={publishing} disabled={!canPublish} onClick={onPublish}>
            {t('freelance.edit.publish', lang)}
          </Button>
        </span>
      </div>
    </div>
  )
}
