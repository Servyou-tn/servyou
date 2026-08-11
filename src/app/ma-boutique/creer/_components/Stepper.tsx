import { cn } from '@/lib/utils'

// G2's 2-step "Bases / Configuration" wizard indicator — Figma 555:37245 (760×100, measured in
// docs/design/g2-discovery.md §2). No `HorizontalStepper` exists anywhere in code yet despite a
// prior Figma-only memory naming one; this is the first real consumer, route-local per the rule.
//
// Purely visual — the brief renders the stepper "as drawn" with step 2 not yet reachable, so this
// is not a nav control (no link, no click). Active/upcoming fills are UNMEASURED (get_metadata
// doesn't expand instance-internal fills); built to the in-repo brand-blue-600-fill /
// outline-muted convention rather than a second Figma call — flagged in g2-discovery.md §8.
export function Stepper({ steps }: { steps: { label: string; state: 'active' | 'upcoming' }[] }) {
  return (
    <ol className="flex items-start" aria-hidden="true">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-start">
          {i > 0 && <div className="mt-[17px] h-0.5 w-10 shrink-0 bg-border-subtle" />}
          <div className="flex w-20 flex-col items-center gap-2 text-center">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                step.state === 'active'
                  ? 'bg-brand-blue-600 text-text-inverse'
                  : 'border border-border-strong text-text-muted',
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                step.state === 'active' ? 'text-text-primary' : 'text-text-muted',
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
