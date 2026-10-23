import { Check } from 'lucide-react'

// Stepper — the wizard progress indicator, promoted to components/ui on its third wizard (G2
// /ma-boutique/creer, H2 /mon-profil-freelance/creer, H6 /mes-services/creer). Replaces the two
// route-local copies G2 and H2 carried.
//
// Visual values are H6's, the only frame that measures all three states (docs/design/
// h6-measurements.md): 459:18609 (page frame) for active/upcoming, 461:19407 (specimen) for done.
// Founder ruling 2026-10-23 (D2): G2 and H2 adopt this look too; each keeps its own widths.
//   • circle 36 (h-9); done/active blue-600 + inverse, upcoming surface-base + 2px border-subtle
//   • number Semi Bold 16; done = check 18
//   • label body-sm 14/21 — active Semi Bold primary, done Regular secondary, upcoming Regular muted
//   • connector line 2px, blue-600 after a done step, border-subtle otherwise
//
// Geometry is the caller's:
//   • 'compact' — 80 columns, fixed 40 connectors (G2's 2 steps, H2's 3: 3×80 + 2×40 = 320 fits a
//     343 mobile content width).
//   • 'stretch' — 100 columns, connectors fill the row (H6's page frame). Below `sm` the 5 labels
//     can't fit (5×100 > 343), so only the circles show and `summary` (« Étape 1 sur 5 · Métier »)
//     names the active step underneath — founder ruling D3; no mobile frame exists.
//
// Purely visual (aria-hidden, no clicks): each wizard names its step in its own heading. `summary`
// is the one exception — visible on mobile, screen-reader-only from `sm`, so assistive tech gets
// the position on every breakpoint.
//
// Class strings are joined by hand, not through cn(): tailwind-merge evicts the custom `text-body-sm`
// size token when a text-colour class sits next to it (reference_twmerge_text_size_color_footgun).

export type StepState = 'done' | 'active' | 'upcoming'

export function Stepper({
  steps,
  layout = 'compact',
  summary,
}: {
  steps: { label: string; state: StepState }[]
  layout?: 'compact' | 'stretch'
  /** One-line position text, e.g. « Étape 1 sur 5 · Métier ». */
  summary?: string
}) {
  const stretch = layout === 'stretch'

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex items-start" aria-hidden="true">
        {steps.map((step, i) => {
          const lit = step.state === 'done' || step.state === 'active'
          return (
            <li key={step.label} className={stretch && i > 0 ? 'flex min-w-0 flex-1 items-start' : 'flex items-start'}>
              {i > 0 && (
                <div className={stretch ? 'flex h-9 min-w-0 flex-1 items-center' : 'flex h-9 w-10 shrink-0 items-center'}>
                  <div
                    className={`h-0.5 w-full ${steps[i - 1].state === 'done' ? 'bg-brand-blue-600' : 'bg-border-subtle'}`}
                  />
                </div>
              )}
              <div
                className={`flex shrink-0 flex-col items-center gap-2 text-center ${stretch ? 'w-9 sm:w-25' : 'w-20'}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-semibold ${
                    lit ? 'bg-brand-blue-600 text-text-inverse' : 'border-2 border-border-subtle bg-surface-base text-text-muted'
                  }`}
                >
                  {step.state === 'done' ? <Check className="h-4.5 w-4.5" /> : i + 1}
                </span>
                <span
                  className={`${stretch ? 'hidden sm:block' : ''} text-body-sm ${
                    step.state === 'active'
                      ? 'font-semibold text-text-primary'
                      : step.state === 'done'
                        ? 'text-text-secondary'
                        : 'text-text-muted'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
      {summary && <p className="text-body-sm font-semibold text-text-primary sm:sr-only">{summary}</p>}
    </div>
  )
}
