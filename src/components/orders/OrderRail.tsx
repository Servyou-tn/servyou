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
            {/* Node width: the rail spans 1071 inside G9's panel and the 6 connectors are
                `flex-1`, so they absorb whatever the nodes do not claim. At w-14 (56) they took
                679 of 1071 while every label was starved into wrapping — the widest, "En
                livraison", needs ~66 at 12px. w-20 (80) clears it and still leaves the connectors
                ~85 each. Figma's stepper is 903.5 across 7 nodes; the exact per-node
                reconciliation is the Figma pass's business, this is the no-wrap floor.

                ⚑ THE WIDENING IS lg-ONLY, and that is not timidity. `shrink-0` means these nodes
                cannot compress, so 7 × 80 = 560 inside the 278 available at a 375 viewport — an
                overflow of 282. At w-14 it is 7 × 56 = 392, i.e. 114. BOTH overflow; widening
                unconditionally would have made a pre-existing mobile defect 2.5× worse to fix a
                desktop one. Below lg the geometry is therefore left EXACTLY as it shipped (labels
                wrap, which is the right trade in a 56px column), and the mobile overflow is logged
                in docs/follow-ups.md rather than half-fixed here.
                derived: no mobile frame exists for G9, so the below-lg value is inherited, not
                measured. */}
            <div className="flex w-14 shrink-0 flex-col items-center gap-2 lg:w-20">
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
              {/* ⚑ NOT `cn()` — deliberately. tailwind-merge cannot classify our custom
                  `text-*` SIZE tokens (`text-caption` is neither a built-in size nor an arbitrary
                  value), so it files them in the catch-all `text-*` COLOUR group. Any merged
                  string holding both a size token and a colour token therefore drops one, and the
                  later wins. Here `text-text-secondary` silently deleted `text-caption`, and these
                  labels shipped at the inherited 16px inside a 16px line box instead of 12/16.
                  Reproducible in isolation:
                    twMerge('text-caption text-text-secondary') === 'text-text-secondary'
                  A plain template makes the collision STRUCTURALLY IMPOSSIBLE rather than
                  order-dependent: reordering cannot bring it back, because nothing merges. Class
                  order was never a guard rail — this is the third eviction in this codebase (a size,
                  then a colour on G9's WhatsApp label, now a size again).
                  `cn()` is still correct on the circle above: those are bg/border groups with no
                  size token, so there is nothing to collide. See docs/follow-ups.md for the
                  systemic fix. */}
              {/* G9 delta S4. Figma 495:26289 paints the label per state: completed `#0f172a`
                  Medium, CURRENT `#1f5fe0` Semi Bold, upcoming `#64748b` Medium. It shipped with
                  completed and current sharing one `text-secondary` Medium, so the current stage had
                  no emphasis at all — a rail whose only job is answering "where am I?" could not.
                  The circle already carries a blue ring; the label now agrees with it.
                  Completed is left at `text-secondary` deliberately: Figma's `#0f172a` would make a
                  DONE stage the darkest thing in the rail and out-shout the current one. */}
              <span
                className={`text-center text-caption leading-4 ${
                  state === 'current'
                    ? 'font-semibold text-brand-blue-600'
                    : state === 'upcoming'
                      ? 'font-medium text-text-muted'
                      : 'font-medium text-text-secondary'
                }`}
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
