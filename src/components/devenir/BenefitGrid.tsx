import type { ReactNode } from 'react'

export type Benefit = { icon: ReactNode; title: string; description: string }

export function BenefitGrid({
  sectionTitle,
  sectionSubtitle,
  benefits,
}: {
  sectionTitle: string
  sectionSubtitle: string
  benefits: Benefit[]
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-3 text-center text-3xl font-bold text-text-primary md:text-4xl">{sectionTitle}</h2>
      <p className="mx-auto mb-8 max-w-2xl text-center text-base text-text-muted">{sectionSubtitle}</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
