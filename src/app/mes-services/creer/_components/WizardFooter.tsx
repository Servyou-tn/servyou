'use client'

import { Button } from '@/components/ui/button'
import { BUILT_STEPS } from '@/lib/freelance/service-draft'
import { t, type Lang } from '@/lib/i18n'

// H6 wizard footer — Figma 459:18873 (inside read 1, docs/design/h6-measurements.md): full width of
// the main column, border-t border-subtle, bg base, px 32 / py 20, groups gap 12. Left: secondary
// « Enregistrer le brouillon » + caption « Enregistré automatiquement » (body-sm muted). Right:
// primary « Suivant », drawn disabled — the step gate (founder ruling D9). On step 5 (Figma 459:19149,
// read 6) the primary is « Publier mon service ».
//
// Not in the frames, founder-ruled or proposed in docs/design/h6-pr2-deltas.md / h6-pr4-deltas.md:
//   • sticky to the viewport bottom, bleeding over AppShell main's padding (-mx/-mb = its px/py);
//   • « Précédent » (secondary) from step 2 on — kept on step 5 too, as is the caption, though 459:19149
//     draws neither (D27: the PR-2/3 footer carries over);
//   • « Publier mon service » shows the Button's own loading state while it publishes; the whole footer
//     is inert meanwhile, so a « Précédent » can't race the publish;
//   • the caption follows the autosave: nothing before the first save, « Enregistrement… » while
//     saving, the frame's text once saved, the save error (danger) when a save fails (D8);
//   • below `sm` the caption sits on its own line above the buttons (no mobile frame).
// The caption is a polite live region, so a screen reader hears "saved" without losing focus.
//
// EDIT MODE (H7, docs/design/h7-deltas.md): no « Enregistrer le brouillon » (nothing is autosaved on a live
// service), the caption says « Modifications non enregistrées » while the form differs from what was
// loaded, and the step-5 primary is « Enregistrer les modifications ».

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function WizardFooter({
  lang,
  step,
  saveState,
  saveErrorKey,
  canNext,
  editing,
  unsaved,
  publishing,
  onSaveDraft,
  onPrevious,
  onNext,
  onPublish,
}: {
  lang: Lang
  step: number
  saveState: SaveState
  saveErrorKey: string | null
  /** Steps 1–4: the step's gate. Step 5: steps 1–4 all pass. */
  canNext: boolean
  /** H7 edit mode. */
  editing: boolean
  /** Edit mode: the form differs from what was loaded / last saved. */
  unsaved: boolean
  publishing: boolean
  onSaveDraft: () => void
  onPrevious: () => void
  onNext: () => void
  onPublish: () => void
}) {
  const caption = editing
    ? unsaved
      ? t('service.edit.footer.dirty', lang)
      : ''
    : saveState === 'saving'
      ? t('common.saving', lang)
      : saveState === 'saved'
        ? t('service.wizard.footer.saved', lang)
        : saveState === 'error' && saveErrorKey
          ? t(saveErrorKey, lang)
          : ''
  const lastStep = step >= BUILT_STEPS

  return (
    // One wrapping row. From `sm`: [brouillon][caption] ……… [précédent][suivant], as drawn. Below it the
    // caption takes its own line on top so the buttons share one row instead of stacking three deep.
    <div className="sticky bottom-[var(--cookie-banner-h,0px)] z-10 -mx-4 -mb-6 mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border-subtle bg-surface-base px-4 py-4 md:-mx-8 md:-mb-8 md:px-8 md:py-5">
      {!editing && (
        <Button variant="secondary" onClick={onSaveDraft} disabled={publishing} className="order-2 sm:order-1">
          {t('service.wizard.footer.save_draft', lang)}
        </Button>
      )}
      <p
        role="status"
        aria-live="polite"
        className={`order-1 basis-full text-body-sm sm:order-2 sm:basis-auto ${saveState === 'error' ? 'text-danger-500' : 'text-text-muted'}`}
      >
        {caption}
      </p>
      <div className="order-3 ms-auto flex flex-wrap items-center justify-end gap-3">
        {step > 1 && (
          <Button variant="secondary" onClick={onPrevious} disabled={publishing}>
            {t('service.wizard.footer.previous', lang)}
          </Button>
        )}
        {lastStep ? (
          // « Enregistrer les modifications » is wider than 343 px next to « Précédent »: below `sm` it takes its own row.
          <Button disabled={!canNext} loading={publishing} onClick={onPublish} className={editing ? 'max-sm:w-full' : undefined}>
            {t(editing ? 'service.edit.footer.save' : 'service.wizard.footer.publish', lang)}
          </Button>
        ) : (
          <Button disabled={!canNext} onClick={onNext}>
            {t('service.wizard.footer.next', lang)}
          </Button>
        )}
      </div>
    </div>
  )
}
