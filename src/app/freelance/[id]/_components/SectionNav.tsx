import { cn } from '@/lib/utils'

// Shared anchor-jump nav — measured once in the hero (390:10694) and again, identically, in the
// sticky bar specimen (390:10697). One component, two mount points, so the two never drift.
export type NavSection = { id: string; label: string }

export function SectionNav({ sections, activeId, className }: { sections: NavSection[]; activeId?: string; className?: string }) {
  if (sections.length === 0) return null
  return (
    <nav className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)} aria-label="section">
      {sections.map((s, i) => (
        <span key={s.id} className="flex items-center gap-2">
          <a
            href={`#${s.id}`}
            className={cn(
              'text-body-sm hover:text-brand-blue-600',
              s.id === activeId ? 'font-semibold text-brand-blue-600' : 'font-medium text-text-secondary',
            )}
          >
            {s.label}
          </a>
          {i < sections.length - 1 && <span className="text-text-muted">·</span>}
        </span>
      ))}
    </nav>
  )
}
