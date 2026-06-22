'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, ChevronDown } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { filterFaq, type ResolvedCategory } from '@/lib/faq/faq-content'

// Debounced search (200ms) over the resolved FAQ + a multi-open accordion (more
// discoverable than single-open for a search-friendly FAQ; all closed by default).
export function FaqView({ categories }: { categories: ResolvedCategory[] }) {
  const lang = useLang()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(id)
  }, [query])

  const filtered = useMemo(() => filterFaq(categories, debounced), [categories, debounced])

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B6B6B]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('faq.search.placeholder', lang)}
          aria-label={t('faq.search.placeholder', lang)}
          className={`w-full rounded-full border border-border-subtle bg-white py-3 pl-12 pr-4 text-sm text-[#0A0A0A] placeholder:text-[#6B6B6B] ${FOCUS_RING}`}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border-subtle bg-white p-8 text-center">
          <p className="text-sm text-[#6B6B6B]">{t('faq.search.noResults', lang)}</p>
          <Link
            href="/contact"
            className={`mt-3 inline-block rounded text-sm font-semibold text-brand-accent hover:underline ${FOCUS_RING}`}
          >
            {t('faq.search.contactLink', lang)}
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {filtered.map((cat) => (
            <section key={cat.title}>
              <h2 className="mb-3 text-lg font-bold text-text-primary">{cat.title}</h2>
              <div className="divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-white">
                {cat.questions.map((item) => {
                  const isOpen = open.has(item.id)
                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        aria-expanded={isOpen}
                        className={`flex min-h-[56px] w-full items-center justify-between gap-4 px-5 py-4 text-start hover:bg-slate-50 ${FOCUS_RING}`}
                      >
                        <span className="text-sm font-medium text-text-primary">{item.q}</span>
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 text-[#6B6B6B] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm leading-relaxed text-[#6B6B6B]">{item.a}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
