import { t, type Lang } from '@/lib/i18n'

// Section 6 — the four-step process. Big brand-accent numerals, title, one-line
// body, with a dashed connector running behind the numbers on desktop to suggest
// flow (masked by each numeral's background so it reads as segments). The 01–04
// numerals are decorative and identical across languages, so they live in the
// component, not i18n. No section heading: the template defines only the steps.
const steps = [
  { n: '01', titleKey: 'landing.how.step1_title', bodyKey: 'landing.how.step1_body' },
  { n: '02', titleKey: 'landing.how.step2_title', bodyKey: 'landing.how.step2_body' },
  { n: '03', titleKey: 'landing.how.step3_title', bodyKey: 'landing.how.step3_body' },
  { n: '04', titleKey: 'landing.how.step4_title', bodyKey: 'landing.how.step4_body' },
] as const

export function HowItWorks({ lang }: { lang: Lang }) {
  return (
    <section className="bg-surface-base">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="relative grid gap-12 lg:grid-cols-4">
          {/* Dashed connector behind the numerals (desktop only). */}
          <div
            className="pointer-events-none absolute inset-x-0 top-9 hidden border-t border-dashed border-border-subtle lg:block"
            aria-hidden="true"
          />
          {steps.map(step => (
            <div key={step.n} className="relative">
              <span className="relative z-10 inline-block bg-surface-base pr-4 text-[80px] font-bold leading-none tracking-tight text-brand-accent">
                {step.n}
              </span>
              <h3 className="mt-6 text-2xl font-semibold text-text-primary">{t(step.titleKey, lang)}</h3>
              <p className="mt-3 text-base leading-relaxed text-text-muted">{t(step.bodyKey, lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
