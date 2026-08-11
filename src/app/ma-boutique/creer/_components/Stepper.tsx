import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// G2's 2-step "Bases / Configuration" wizard indicator — Figma 555:37245 (760×100, measured in
// docs/design/g2-discovery.md §2). No `HorizontalStepper` exists anywhere in code yet despite a
// prior Figma-only memory naming one; step 1 was its first consumer, step 2
// (/ma-boutique/creer/configuration) is its second — still route-local per the "promote at third
// consumer" rule, shared across the two sibling routes under ma-boutique/creer/**.
//
// Purely visual — no link, no click, on either step. `done` is step 2's addition (step 1 rendered
// only itself, never a completed neighbour): filled circle + checkmark, UNMEASURED (no Figma read
// backs the glyph — g2-discovery.md §13) but consistent with the already-unmeasured active/upcoming
// fills (§8) and the common wizard convention.
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
