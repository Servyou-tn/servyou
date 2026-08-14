import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// H2's 3-step wizard indicator — Figma 466:20291 measured circle(36)/connector(40)/label at an
// 80px column width (G2's `w-20`), NOT the frame's own w-100. docs/design/h2-discovery.md
// records the frame's measured 100px column (3×100 + 2×40 = 380) and flags it as a value the
// Figma quota could not re-verify past the screenshot — the arithmetic for the divergence taken
// here lives there. 3 steps at 80px columns = 3×80 + 2×40 = 320px, which fits inside a 343px
// mobile content width (375 − 2×16); the measured 380px does not (overflows by 37px). Copied
// from G2's Stepper (ma-boutique/creer/_components/Stepper.tsx) verbatim at the pixel level —
// same "promote at third consumer" component this file leaves route-local rather than
// promotes; see docs/follow-ups.md.
//
// Purely visual — no link, no click, on any step. `done` mirrors G2's step-2 addition
// (unmeasured checkmark glyph, consistent convention) — step 1 itself never renders a
// completed neighbour, but the type carries it so a later step in this same wizard can.
export function Stepper({ steps }: { steps: { label: string; state: 'done' | 'active' | 'upcoming' }[] }) {
  return (
    <ol className="flex items-start" aria-hidden="true">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-start">
          {i > 0 && <div className="mt-[17px] h-0.5 w-10 shrink-0 bg-border-subtle" />}
          <div className="flex w-20 flex-col items-center gap-2 text-center">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                step.state === 'active' || step.state === 'done'
                  ? 'bg-brand-blue-600 text-text-inverse'
                  : 'border border-border-strong text-text-muted',
              )}
            >
              {step.state === 'done' ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                step.state === 'upcoming' ? 'text-text-muted' : 'text-text-primary',
              )}
            >
              {step.label}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
