import type { ReactNode } from 'react'

// Shared title row for the account pages: page title + optional count pill on the left,
// optional action (e.g. a "Poster une mission" button) on the right.
export function PageHeader({
  title,
  countLabel,
  action,
}: {
  // Optional: the animated shared/PageHeader now owns the title role on these pages, so this
  // row often renders only the count pill + action (e.g. the "Nouvelle mission" button).
  title?: string
  countLabel?: string
  action?: ReactNode
}) {
  // Below lg (m375-f1-favoris — /mes-favoris is this header's only caller): the title 20 Semi Bold / 24, then a full-bleed
  // border/subtle rule closing the 56 px header (stroke inside: 15 + 1) and the tab bar 4 under the rule.
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 max-lg:mb-1 max-lg:border-b max-lg:border-border-subtle max-lg:pb-[15px] max-md:-mx-4 max-md:px-4 md:max-lg:-mx-8 md:max-lg:px-8">
      <div className="flex items-center gap-3">
        {title && <h1 className="text-2xl font-bold text-text-primary max-lg:text-h3 max-lg:leading-6 max-lg:font-semibold">{title}</h1>}
        {countLabel && (
          <span className="rounded-full bg-surface-pill px-3 py-1 text-xs font-medium text-text-muted">
            {countLabel}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}
