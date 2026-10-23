'use client'

import { Button } from '@/components/ui/button'
import { t, type Lang } from '@/lib/i18n'

// H6 wizard footer — Figma 459:18873 (inside read 1, docs/design/h6-measurements.md): full width of
// the main column, border-t border-subtle, bg base, px 32 / py 20, groups gap 12. Left: secondary
// « Enregistrer le brouillon » + caption « Enregistré automatiquement » (body-sm muted). Right:
// primary « Suivant », drawn disabled — the step gate (founder ruling D9).
//
// Not in the frame, founder-ruled or proposed in docs/design/h6-pr2-deltas.md:
//   • sticky to the viewport bottom, bleeding over AppShell main's padding (-mx/-mb = its px/py);
//   • « Précédent » (secondary) from step 2 on;
//   • step 2's « Suivant » stays disabled with « Bientôt disponible » until step 3 ships (D6);
//   • the caption follows the autosave: nothing before the first save, « Enregistrement… » while
//     saving, the frame's text once saved, the save error (danger) when a save fails (D8);
//   • below `sm` the caption sits on its own line above the buttons (no mobile frame).
// The caption is a polite live region, so a screen reader hears "saved" without losing focus.

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function WizardFooter({
  lang,
  step,
  saveState,
  saveErrorKey,
  canNext,
  onSaveDraft,
  onPrevious,
  onNext,
}: {
  lang: Lang
  step: number
  saveState: SaveState
  saveErrorKey: string | null
  canNext: boolean
  onSaveDraft: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  const caption =
    saveState === 'saving'
      ? t('common.saving', lang)
      : saveState === 'saved'
        ? t('service.wizard.footer.saved', lang)
        : saveState === 'error' && saveErrorKey
          ? t(saveErrorKey, lang)
          : ''
  // Step 3 isn't built yet (PR-3): « Suivant » on the last built step can't lead anywhere.
  const nextComingSoon = step >= 2

  return (
    // One wrapping row. From `sm`: [brouillon][caption] ……… [précédent][suivant], as drawn. Below it the
    // caption takes its own line on top so the buttons share one row instead of stacking three deep.
    <div className="sticky bottom-0 z-10 -mx-4 -mb-6 mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border-subtle bg-surface-base px-4 py-4 md:-mx-8 md:-mb-8 md:px-8 md:py-5">
      <Button variant="secondary" onClick={onSaveDraft} className="order-2 sm:order-1">
        {t('service.wizard.footer.save_draft', lang)}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className={`order-1 basis-full text-body-sm sm:order-2 sm:basis-auto ${saveState === 'error' ? 'text-danger-500' : 'text-text-muted'}`}
      >
        {caption}
      </p>
      <div className="order-3 ms-auto flex items-center gap-3">
        {step > 1 && (
          <Button variant="secondary" onClick={onPrevious}>
            {t('service.wizard.footer.previous', lang)}
          </Button>
        )}
        {nextComingSoon ? (
          <span title={t('marche.sidebar.coming_soon', lang)}>
            <Button disabled>{t('service.wizard.footer.next', lang)}</Button>
          </span>
        ) : (
          <Button disabled={!canNext} onClick={onNext}>
            {t('service.wizard.footer.next', lang)}
          </Button>
        )}
      </div>
    </div>
  )
}
