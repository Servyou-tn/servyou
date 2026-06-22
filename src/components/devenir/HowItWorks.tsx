export type Step = { number: string; title: string; description: string }

export function HowItWorks({ sectionTitle, steps }: { sectionTitle: string; steps: Step[] }) {
  return (
    <section className="mb-12">
      <h2 className="mb-8 text-center text-3xl font-bold text-text-primary md:text-4xl">{sectionTitle}</h2>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.number} className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-accent text-2xl font-bold text-white">
              {s.number}
            </div>
            <h3 className="mb-2 text-xl font-semibold text-text-primary">{s.title}</h3>
            <p className="text-base leading-relaxed text-text-muted">{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
