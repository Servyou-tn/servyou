'use client'

import { useId, useState } from 'react'
import { Mail, Plus, X } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { TITLE } from './ui'

// Section 6 · FAQ (#faq) — Figma 1722:51556 (ref: Pinterest « Common Questions » accordion).
// Light rounded box (white → surface-sunken), « ● FAQ » pill, one centred 880 / 327 column of 8 numbered
// rows. One row open at a time; the open row gets the blue-300 border, the outlined « × » and its answer.
const QUESTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export function Faq() {
  const lang = useLang()
  const [open, setOpen] = useState<number | null>(1)
  const base = useId()

  return (
    <section
      id="faq"
      className="mx-2 mt-4 flex scroll-mt-20 flex-col items-center gap-7 rounded-3xl border border-border-subtle bg-gradient-to-b from-surface-base to-surface-sunken px-4 py-14 lg:mx-6 lg:mt-8 lg:gap-10 lg:rounded-[32px] lg:py-24"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="inline-flex h-[31px] items-center gap-2 rounded-full border border-border-subtle bg-surface-base px-3.5">
          <span className="size-2 rounded-full bg-brand-blue-600" aria-hidden="true" />
          <span className="text-xs leading-[17px] font-semibold uppercase tracking-[0.08em] text-text-primary rtl:tracking-normal">{t('lp.faq.eyebrow', lang)}</span>
        </span>
        <h2 className={cn(TITLE, 'text-center text-text-primary')}>{t('lp.faq.title', lang)}</h2>
      </div>

      <ul className="flex w-full max-w-[880px] flex-col gap-2.5 lg:gap-3">
        {QUESTIONS.map(n => {
          const isOpen = open === n
          const qId = `${base}-q${n}`
          const aId = `${base}-a${n}`
          return (
            <li
              key={n}
              className={cn(
                'rounded-2xl bg-surface-base lg:rounded-[20px]',
                isOpen
                  ? 'border-2 border-brand-blue-300 shadow-[0_12px_32px_-8px_rgb(31_94_224/0.10)]'
                  : 'border border-border-subtle',
              )}
            >
              <h3>
                <button
                  type="button"
                  id={qId}
                  aria-expanded={isOpen}
                  aria-controls={aId}
                  onClick={() => setOpen(isOpen ? null : n)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-2xl text-start lg:gap-3.5 lg:rounded-[20px]',
                    isOpen ? 'ps-[13px] pe-[11px] pt-[13px] pb-1 lg:ps-5 lg:pe-[15px] lg:pt-[18px]' : 'py-3.5 ps-3.5 pe-3 lg:py-[18px] lg:ps-5 lg:pe-4',
                    FOCUS_RING,
                  )}
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs leading-[17px] font-semibold',
                      isOpen ? 'bg-brand-blue-50 text-brand-blue-700' : 'bg-surface-sunken text-text-secondary',
                    )}
                  >
                    {n}
                  </span>
                  <span
                    className={cn(
                      'flex-1 text-sm leading-[21px] text-text-primary lg:text-base lg:leading-[26px]',
                      isOpen ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {t(`lp.faq.q${n}`, lang)}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full lg:size-9',
                      isOpen ? 'border-[1.5px] border-brand-blue-600 bg-surface-base text-brand-blue-600' : 'bg-brand-blue-600 text-text-inverse',
                    )}
                  >
                    {isOpen ? <X className="size-3.5 lg:size-4" /> : <Plus className="size-3.5 lg:size-4" />}
                  </span>
                </button>
              </h3>
              <div id={aId} role="region" aria-labelledby={qId} hidden={!isOpen} className="pe-3 pb-[13px] ps-[51px] lg:pe-[15px] lg:pb-[18px] lg:ps-[62px]">
                <p className="max-w-[560px] text-sm leading-[21px] text-text-secondary lg:text-base lg:leading-[26px]">{t(`lp.faq.a${n}`, lang)}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col items-center gap-1.5">
        <p className="text-sm leading-[21px] text-text-secondary">{t('lp.faq.more', lang)}</p>
        <a
          href="mailto:contact@servyou.tn"
          className={cn('inline-flex items-center gap-1.5 rounded-md text-sm leading-[21px] font-semibold text-brand-blue-700 underline hover:no-underline', FOCUS_RING)}
        >
          <Mail className="size-4" aria-hidden="true" />
          contact@servyou.tn
        </a>
      </div>
    </section>
  )
}
