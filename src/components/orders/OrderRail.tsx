import type { CSSProperties } from 'react'
import { Check, X } from 'lucide-react'
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
  timestampFor,
  lang,
  look = 'compact',
  cancelledAfter,
  cancelledLabelKey,
  ariaLabel,
}: {
  /** The chain to walk — `lifecycleFor(orderType)`. */
  stages: readonly string[]
  status: string
  /** Stage → i18n key. Kept a prop because product and service label the same stage differently. */
  labelKeyFor: (stage: string) => string
  /**
   * Stage → an already-formatted date, or null when that stage has no recorded event.
   *
   * OPTIONAL, and that is the whole point: `OrderRail` has two consumers, and E3's buyer rail
   * (`/mes-commandes`) does not read `order_events`. Omitting the prop leaves E3 rendering exactly
   * what it renders today — the shared-component blast radius that S8/S9's connector colours are
   * still blocked on. Formatting is the caller's job so this stays presentational and needs no
   * locale of its own beyond `lang`.
   */
  timestampFor?: (stage: string) => string | null
  lang: Lang
  /**
   * `compact` (default) is the rail E3, G9 and H8 render today — NOTHING about it changes.
   * `detail` is the E4 buyer-detail stepper (Figma « Order Stepper », 1469:23519 / 1475:25872): 14px labels, a connector that
   * turns blue behind a completed stage, equal columns on desktop and a VERTICAL layout with dates below `lg`. Opt-in, so the
   * three existing consumers keep their measured look (their connector/label deltas stay open, S8/S9).
   */
  look?: 'compact' | 'detail'
  /**
   * `detail` only. When set the order was CANCELLED after this stage: stages up to and including it are completed, the NEXT one
   * is replaced by a red « Annulée » node (Figma 1472:25035) and the rest stay upcoming.
   */
  cancelledAfter?: string
  /** i18n key of that red node's label. */
  cancelledLabelKey?: string
  /** `detail` only — the list's accessible name. */
  ariaLabel?: string
}) {
  if (look === 'detail') {
    return (
      <DetailRail
        stages={stages}
        status={status}
        labelKeyFor={labelKeyFor}
        timestampFor={timestampFor}
        lang={lang}
        cancelledAfter={cancelledAfter}
        cancelledLabelKey={cancelledLabelKey}
        ariaLabel={ariaLabel}
      />
    )
  }
  return (
    <ol className="flex items-start">
      {stages.map((stage, i) => {
        const state = stageStateIn(stages, status, i)
        const timestamp = timestampFor?.(stage) ?? null
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
              {/* Per-stage timestamp, from the `order_events` row whose `to_status` is this stage.

                  ⚑ NO FIGMA SOURCE — and that is deliberate, not an oversight. An earlier delta
                  pass recorded seven hidden `date` layers on 495:26289; a direct MCP inspection
                  (2026-07-31) found `hiddenNodes` EMPTY and no such layers. The frame does not
                  describe this line at all, so the type below is a CODE-SIDE CHOICE:
                  `text-caption` / `font-medium` / `text-text-muted` is exactly the treatment the
                  rail already gives its UPCOMING label, which IS Figma-verified (delta S5,
                  `#64748b` Medium). Reusing an approved combination from this same component beats
                  inventing one. Design owes a confirmation — F2 in docs/design/g9-deltas-2.md,
                  which now asks for the layer to be added to the MAIN COMPONENT 140:9067, since
                  there is nothing to unhide and an instance-level edit would not propagate.

                  Gap: inherited from the container's `gap-2` (8) rather than given a bespoke 4.
                  Figma's node gaps are a uniform 4 and the code's are a uniform 8 — that is open
                  delta S2, and it is uniform on BOTH sides. Hard-coding 4 here alone would make the
                  rail internally inconsistent (8 then 4) and would fight S2's eventual one-line fix.

                  NOT `cn()` — same reason as the label directly above: tailwind-merge files
                  `text-caption` in the catch-all `text-*` COLOUR group, so merging it with
                  `text-text-muted` would silently delete the size. A plain template cannot collide.

                  Absent, not blank, when there is no event: no empty element, no placeholder dash.
                  A stage with nothing recorded renders the label alone and the node simply sits
                  shorter, which reads as "not recorded" rather than as a missing value. */}
              {timestamp ? (
                <span className="text-center text-caption font-medium text-text-muted">
                  {timestamp}
                </span>
              ) : null}
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

type DetailState = 'completed' | 'current' | 'upcoming' | 'cancelled'

// E4's stepper. Measured from the dump of 1469:23519 (horizontal) and 1475:25872 (vertical):
//   • node = a 32px circle + a 14px label (Medium; current Semi Bold blue; cancelled Semi Bold danger); gap 4
//   • horizontal: seven EQUAL columns (the circle centres sit 141px apart in a ~990px band); the connector is 2px and runs
//     between circle CENTRES — blue/600 behind a completed stage, border/strong otherwise (all border/strong once cancelled)
//   • vertical (below lg): circle + [label over a 12px date], connectors 2×26 between circles — the dates exist ONLY here (the desktop
//     frame has the date layer hidden)
// One <ol>, restyled by breakpoint, so a screen reader meets each stage once.
//
// ⚑ Label classes are a plain template, NOT cn(): tailwind-merge files our custom `text-*` size tokens in the colour group and
// would evict the size (the OrderRail eviction recorded above).
function DetailRail({
  stages,
  status,
  labelKeyFor,
  timestampFor,
  lang,
  cancelledAfter,
  cancelledLabelKey,
  ariaLabel,
}: {
  stages: readonly string[]
  status: string
  labelKeyFor: (stage: string) => string
  timestampFor?: (stage: string) => string | null
  lang: Lang
  cancelledAfter?: string
  cancelledLabelKey?: string
  ariaLabel?: string
}) {
  const cancelledIndex = cancelledAfter ? stages.indexOf(cancelledAfter) + 1 : -1
  const isCancelled = cancelledAfter !== undefined && cancelledIndex > 0 && cancelledIndex < stages.length

  function stateOf(i: number): DetailState {
    if (isCancelled) {
      if (i < cancelledIndex) return 'completed'
      if (i === cancelledIndex) return 'cancelled'
      return 'upcoming'
    }
    return stageStateIn(stages, status, i)
  }

  // Equal columns whose width is MEASURED per chain: the circle centres sit 141px apart on the 7-step product frame and 162px
  // apart on the 4-step service frame. The band is `columns × that`, centred in the panel; below lg it is a single vertical list
  // (the template/--rail-w only take effect from lg).
  const columnWidth = stages.length <= 4 ? 162 : 141
  const railStyle = {
    '--rail-w': `${stages.length * columnWidth}px`,
    gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
  } as CSSProperties

  return (
    <ol
      aria-label={ariaLabel}
      className="mx-auto flex max-w-sm flex-col gap-[26px] lg:grid lg:max-w-[var(--rail-w)] lg:gap-0"
      style={railStyle}
    >
      {stages.map((stage, i) => {
        const state = stateOf(i)
        const timestamp = state === 'cancelled' ? null : (timestampFor?.(stage) ?? null)
        const labelKey = state === 'cancelled' && cancelledLabelKey ? cancelledLabelKey : labelKeyFor(stage)
        // The connector AFTER this node: blue only when this stage is completed and the order is not cancelled.
        const connectorBlue = !isCancelled && state === 'completed'
        return (
          <li
            key={stage}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex h-8 items-center gap-3 lg:h-auto lg:flex-col lg:items-center lg:gap-1"
          >
            {i < stages.length - 1 ? (
              <span
                aria-hidden="true"
                className={`absolute start-4 top-full h-[26px] w-0.5 lg:start-1/2 lg:top-4 lg:h-0.5 lg:w-full ${
                  connectorBlue ? 'bg-brand-blue-600' : 'bg-border-strong'
                }`}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                state === 'completed' && 'bg-brand-blue-600',
                state === 'current' && 'border-2 border-brand-blue-600 bg-surface-base',
                state === 'upcoming' && 'border-[1.5px] border-border-strong bg-surface-base',
                state === 'cancelled' && 'bg-danger-500',
              )}
            >
              {state === 'completed' ? <Check className="h-4 w-4 text-text-inverse" /> : null}
              {state === 'cancelled' ? <X className="h-4 w-4 text-text-inverse" /> : null}
              {state === 'current' ? <span className="h-2.5 w-2.5 rounded-full bg-brand-blue-600" /> : null}
            </span>
            <span className="flex flex-col lg:items-center">
              <span
                className={`text-body-sm lg:text-center ${
                  state === 'current'
                    ? 'font-semibold text-brand-blue-600'
                    : state === 'cancelled'
                      ? 'font-semibold text-danger-500'
                      : state === 'upcoming'
                        ? 'font-medium text-text-muted'
                        : 'font-medium text-text-primary'
                }`}
              >
                {t(labelKey, lang)}
              </span>
              {timestamp ? (
                <span className="text-caption font-medium text-text-muted lg:hidden">{timestamp}</span>
              ) : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
