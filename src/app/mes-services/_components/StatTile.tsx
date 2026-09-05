import { cn } from '@/lib/utils'

// H5's own stat tile — measured from Figma 243:695 (label 14 Medium text/secondary · value 28
// Bold text/primary · subtitle 12 text/muted, border/subtle 1px + radius 12 + pad 20 + gap 8).
//
// ⚑ THIRD ROUTE-LOCAL COPY, DELIBERATELY NOT PROMOTED. tableau-de-bord-vendeur/_components/
// StatTile.tsx (G4, 1st) and tableau-de-bord/_components/StatTile.tsx (H4, 2nd) both already carry
// the "promote at the 3rd consumer" comment this file is the trigger for — and this one also needs
// a `delta` region neither of those has (H5's "Commandes ce mois" tile is the first REAL delta
// value in the app; H4's own Vues du profil tile deliberately renders none, per
// servyou-phase-aware-features). Promoting three call sites' shapes into one `src/components/ui`
// primitive from inside an H5 PR would touch two already-shipped dashboards — out of this PR's
// scope. Logged in docs/follow-ups.md per the same rule FreelancerShareButton hit in D4.
export function StatTile({
  label,
  value,
  subtitle,
  delta,
}: {
  label: string
  value: string
  /** Plain subtitle line — mutually exclusive with `delta` (only one is ever measured per tile). */
  subtitle?: string
  /** "Commandes ce mois"'s delta row: a signed count plus a comparison caption. */
  delta?: { direction: 'up' | 'down' | 'flat'; text: string; caption: string }
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-xl border border-border-subtle bg-surface-base p-5">
      <p className="text-body-sm font-medium text-text-secondary">{label}</p>
      <p className="text-[28px] font-bold leading-[normal] text-text-primary">{value}</p>
      {subtitle ? <p className="text-caption text-text-muted">{subtitle}</p> : null}
      {delta ? (
        <p className="flex items-baseline gap-1.5">
          <span
            dir="ltr"
            className={cn(
              'text-caption font-semibold',
              delta.direction === 'up' && 'text-success-500',
              delta.direction === 'down' && 'text-danger-500',
              delta.direction === 'flat' && 'text-text-muted',
            )}
          >
            {delta.text}
          </span>
          <span className="text-caption text-text-muted">{delta.caption}</span>
        </p>
      ) : null}
    </div>
  )
}
