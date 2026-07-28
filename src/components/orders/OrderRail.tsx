import { Check } from 'lucide-react'
import { stageStateIn } from '@/lib/orders/order-status'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// The order lifecycle rail — completed · current · upcoming, with connectors.
//
// Extracted from E3's `OrdersList.Rail` in the G9 delta pass, which is where the visual language
// was already solved and measured: a 32px node, `blue/600` filled with a white check when
// completed, a 2px `blue/600` ring around a `blue/600` dot when current, a 1.5px `border/strong`
// outline when upcoming, and a 2px connector that is `border/strong` behind a completed stage and
// `border/subtle` ahead of it.
//
// ⚑ THE STAGE SET IS A PROP, the treatment is not. E3 walks the 4-stage SERVICE chain; G9's seller
// walks the 7-step PRODUCT chain from `lifecycleFor()`. Reusing the visual language must not mean
// inheriting the buyer's stages — a seller who sees four steps is being shown someone else's
// journey. That is why this takes `stages` rather than reading `RAIL_STAGES`.
//
// Presentational and lang-driven-by-prop, so a Server Component (G9) and a Client Component (E3's
// list) can both render it.
//
// This REPLACES `OrderLifecycleStepper` for G9. That component predates the design system — raw
// `bg-green-100` / `text-gray-400` / `border-red-200` palette classes, a literal '✓' text
// character, and no connectors at all. It still serves `admin/litiges/[id]`; migrating that is a
// logged follow-up, not this PR's business.
export function OrderRail({
  stages,
  status,
  labelKeyFor,
  lang,
}: {
  /** The chain to walk — `lifecycleFor(orderType)`. */
  stages: readonly string[]
  status: string
  /** Stage → i18n key. Kept a prop because product and service label the same stage differently. */
  labelKeyFor: (stage: string) => string
  lang: Lang
}) {
  return (
    <ol className="flex items-start">
      {stages.map((stage, i) => {
        const state = stageStateIn(stages, status, i)
        return (
          <li key={stage} className="contents">
            {/* derived: no mobile frame for G9. The 7-step chain needs a narrower column than
                E3's 4-stage rail to fit 1136 — w-14 rather than w-16 — and the labels wrap. */}
            <div className="flex w-14 shrink-0 flex-col items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  state === 'completed' && 'bg-brand-blue-600',
                  state === 'current' && 'border-2 border-brand-blue-600 bg-surface-base',
                  state === 'upcoming' && 'border-[1.5px] border-border-strong bg-surface-base',
                )}
              >
                {state === 'completed' ? <Check className="h-4 w-4 text-text-inverse" /> : null}
                {state === 'current' ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-blue-600" />
                ) : null}
              </span>
              <span
                className={cn(
                  'text-center text-caption leading-4 font-medium',
                  state === 'upcoming' ? 'text-text-muted' : 'text-text-secondary',
                )}
              >
                {t(labelKeyFor(stage), lang)}
              </span>
            </div>
            {i < stages.length - 1 ? (
              <div className="mt-4 h-0.5 flex-1" aria-hidden="true">
                <div
                  className={cn(
                    'h-full w-full',
                    state === 'completed' ? 'bg-border-strong' : 'bg-border-subtle',
                  )}
                />
              </div>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
