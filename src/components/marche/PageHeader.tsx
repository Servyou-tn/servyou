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
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {title && <h1 className="text-2xl font-bold text-text-primary">{title}</h1>}
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
