import { AlertTriangle, Check } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { type LegalDocStructure, parseLegalBody, splitLines } from '@/lib/legal/legal-structure'

// Renders one legal document from its key structure: draft banner → title + date → intro
// ("Pourquoi cette page existe") → one-minute summary → optional rights featured block
// (privacy) → sticky TOC + human-opened sections → closing "Parlez-nous". Section bodies
// are parsed from the i18n string convention (blank-line paragraphs; "- " bullet blocks).

function BodyBlocks({ body }: { body: string }) {
  return (
    <>
      {parseLegalBody(body).map((block, i) =>
        block.type === 'ul' ? (
          <ul key={i} className="my-3 list-disc space-y-1.5 ps-5 text-body leading-relaxed text-text-primary">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="my-3 text-body leading-relaxed text-text-primary">
            {block.text}
          </p>
        ),
      )}
    </>
  )
}

export function LegalPageShell({ doc, lang }: { doc: LegalDocStructure; lang: Lang }) {
  const summaryLines = splitLines(t(doc.summaryKey, lang))
  const rightsLines = doc.rightsKey ? splitLines(t(doc.rightsKey, lang)) : []

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      {/* Draft banner */}
      <div
        role="note"
        className="mb-8 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p>{t('legal.draftBanner', lang)}</p>
      </div>

      {/* Title + last updated */}
      <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
        {t(doc.titleKey, lang)}
      </h1>
      <p className="mt-2 text-body-sm text-text-muted">
        {t('legal.updatedLabel', lang)} {t('legal.updatedDate', lang)}
      </p>

      {/* Pourquoi cette page existe */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-text-primary">{t('legal.intro.heading', lang)}</h2>
        <p className="mt-2 text-base leading-relaxed text-text-primary">{t(doc.introKey, lang)}</p>
      </section>

      {/* Résumé en une minute */}
      <section className="mt-6 rounded-2xl border border-border-subtle bg-white p-6">
        <h2 className="text-base font-bold text-text-primary">{t('legal.summary.heading', lang)}</h2>
        <ul className="mt-3 space-y-2">
          {summaryLines.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-text-muted">
              <span aria-hidden="true" className="text-brand-accent">
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Vos droits en un coup d'œil (privacy only) */}
      {rightsLines.length > 0 && (
        <section className="mt-6 rounded-2xl border border-brand-accent/30 bg-brand-accent/5 p-6">
          <h2 className="text-base font-bold text-text-primary">{t('legal.rights.heading', lang)}</h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {rightsLines.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm text-text-primary">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* TOC + sections */}
      <div className="mt-10 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
        <nav aria-label={t('legal.toc', lang)} className="mb-8 lg:mb-0">
          <div className="lg:sticky lg:top-24">
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
              {t('legal.toc', lang)}
            </p>
            <ol className="mt-3 space-y-2">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`rounded text-body-sm leading-snug text-text-muted transition-colors hover:text-brand-accent ${FOCUS_RING}`}
                  >
                    {i + 1}. {t(s.titleKey, lang)}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0">
          {doc.sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-24 border-t border-border-subtle py-8 first:border-t-0 first:pt-0"
            >
              <h2 className="text-xl font-bold text-text-primary">
                {i + 1}. {t(s.titleKey, lang)}
              </h2>
              <p className="mt-2 text-body font-medium italic text-text-muted">{t(s.openerKey, lang)}</p>
              <div className="mt-3">
                <BodyBlocks body={t(s.bodyKey, lang)} />
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Closing — Parlez-nous */}
      <section className="mt-12 rounded-2xl border border-border-subtle bg-white p-6 text-center">
        <h2 className="text-lg font-bold text-text-primary">{t('legal.contact.heading', lang)}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
          {t('legal.contact.body', lang)}
        </p>
      </section>
    </div>
  )
}
