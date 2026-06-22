'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

export type FaqItem = { question: string; answer: string }

// Single-open accordion. Native <button> headers (Enter/Space + Tab handled by the
// browser); the answer slides via the grid-rows-[0fr→1fr] CSS trick (no height JS),
// disabled under reduced motion.
export function FAQ({ sectionTitle, faqs }: { sectionTitle: string; faqs: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="mx-auto mb-12 max-w-3xl">
      <h2 className="mb-8 text-center text-3xl font-bold text-text-primary md:text-4xl">{sectionTitle}</h2>

      {faqs.map((f, i) => {
        const isOpen = open === i
        return (
          <div key={f.question} className="card-premium outline-brand mb-3 rounded-2xl bg-white">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-2xl p-5 text-start',
                FOCUS_RING,
              )}
            >
              <span className="text-base font-medium text-text-primary">{f.question}</span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 motion-reduce:transition-none',
                  isOpen && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </button>
            <div
              className={cn(
                'grid transition-all duration-200 ease-out motion-reduce:transition-none',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <p className="p-5 pt-0 text-base leading-relaxed text-text-muted">{f.answer}</p>
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
