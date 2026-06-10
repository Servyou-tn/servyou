import { t, type Lang } from '@/lib/i18n'

// Section 2 — founder note (honest social proof at launch, no fake testimonials).
// The avatar is a gradient-initials placeholder until a real founder photo exists.
export function FounderNote({ lang }: { lang: Lang }) {
  return (
    <section className="bg-surface-base">
      <div className="mx-auto max-w-[800px] px-6 py-24 text-center">
        <div
          className="mx-auto grid h-20 w-20 place-items-center rounded-full text-2xl font-bold text-white"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))' }}
          aria-hidden="true"
        >
          MZ
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">
          {t('landing.founder.label', lang)}
        </p>
        <p className="mt-1 text-lg font-bold text-text-primary">{t('landing.founder.name', lang)}</p>
        <div className="mx-auto my-6 h-px w-12 bg-border-subtle" />
        <blockquote className="text-xl italic leading-relaxed text-text-primary">
          {t('landing.founder.quote', lang)}
        </blockquote>
      </div>
    </section>
  )
}
