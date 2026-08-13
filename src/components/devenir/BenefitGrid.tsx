import type { ReactNode } from 'react'

export type Benefit = { icon: ReactNode; title: string; description: string }

// `columns` is 4 by default (boutique's current call, byte-identical to before this prop
// existed) or 3 (the freelance rebuild, docs/design/devenir-freelance-discovery.md — the
// frame's own value-cards row is a hard-fit shape, 3×229.33+2×16=720 with zero slack, the same
// D1 overflow signature g1-discovery.md already caught, so this stays fluid `grid-cols-N`
// tracks, never fixed pixel cards). Literal class strings, not an interpolated `grid-cols-${n}`
// — Tailwind's JIT scanner needs the full class name present in source to generate it.
//
// The 3-column track skips the 2-up tablet step 4-column uses (`md:grid-cols-2` before
// `lg:grid-cols-4`): 3 items don't split evenly into 2, so an intermediate 2-then-1-orphan
// state was judged worse than jumping straight from 1-up to 3-up. INFERRED, not measured — no
// Figma frame exists below 1440 for this row (see the discovery doc's breakpoint-plan section
// and docs/follow-ups.md's missing-375-frame entries).
const GRID_COLS: Record<3 | 4, string> = {
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
}

export function BenefitGrid({
  sectionTitle,
  sectionSubtitle,
  benefits,
  columns = 4,
}: {
  sectionTitle?: string
  sectionSubtitle?: string
  benefits: Benefit[]
  columns?: 3 | 4
}) {
  return (
    <section className="mb-12">
      {sectionTitle && (
        <h2 className="mb-3 text-center text-3xl font-bold text-text-primary md:text-4xl">{sectionTitle}</h2>
      )}
      {sectionSubtitle && (
        <p className="mx-auto mb-8 max-w-2xl text-center text-base text-text-muted">{sectionSubtitle}</p>
      )}

      <div className={`grid gap-6 ${GRID_COLS[columns]}`}>
        {benefits.map((b) => (
          <div key={b.title} className="card-premium outline-brand rounded-2xl bg-white p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue-600/10 text-brand-blue-600">
              {b.icon}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-text-primary">{b.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{b.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
