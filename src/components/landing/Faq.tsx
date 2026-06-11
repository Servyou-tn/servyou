import { t, type Lang } from '@/lib/i18n'
import { ChevronDownIcon } from './icons'

// Section 7 — FAQ. Five template questions, all closed by default, built on
// native <details>/<summary> so it needs zero client JS (the chevron rotates via
// the CSS `group-open` variant). Pale-slate background; carries the #faq anchor
// the footer links to. No section heading: the template defines only the Q&A.
const faqs = [
  { qKey: 'landing.faq.q1', aKey: 'landing.faq.a1' },
  { qKey: 'landing.faq.q2', aKey: 'landing.faq.a2' },
  { qKey: 'landing.faq.q3', aKey: 'landing.faq.a3' },
  { qKey: 'landing.faq.q4', aKey: 'landing.faq.a4' },
  { qKey: 'landing.faq.q5', aKey: 'landing.faq.a5' },
] as const

export function Faq({ lang }: { lang: Lang }) {
  return (
    <section id="faq" className="scroll-mt-28 bg-surface-subtle">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-base">
          {faqs.map(({ qKey, aKey }, i) => (
            <details
              key={qKey}
              className={`group px-6 ${i > 0 ? 'border-t border-border-subtle' : ''}`}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold text-text-primary transition-colors hover:text-brand-accent [&::-webkit-details-marker]:hidden">
                {t(qKey, lang)}
                <ChevronDownIcon className="h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="pb-5 text-base leading-relaxed text-text-muted">{t(aKey, lang)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
