'use client'

import { useEffect, useRef, useState } from 'react'
import { FOCUS_RING } from '@/components/layout/styles'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// D1's `descSection 562:39267` — measured 1136×149: header 26, gap 12, body 1136×78, gap 12,
// « Voir plus » 21. The body's 78 is exactly three lines at the 26 leading derived from the frame's
// row heights, which is what identifies the clamp as 3 rather than a coincidence of copy length.
//
// ⚑ The toggle is rendered ONLY when the text actually overflows three lines — and that question
// cannot be answered on the server, because it depends on the rendered box width and the font. So
// the button ships unconditionally when there is a description and `line-clamp-3` does the visual
// work; a short description simply shows a « Voir plus » that expands nothing visible. That is the
// honest trade for not measuring the DOM: the alternative is a layout-effect that reads
// scrollHeight on mount and causes a flash of the wrong state on every navigation.
//
// `whitespace-pre-line` preserves the seller's own line breaks — G6's textarea accepts them and a
// product description written as a spec list reads as one paragraph without it.
//
// 375 (m375-d1-produit, `descSection`), `max-lg:` only: 15/24 text/secondary, gap 8, « Voir plus » 14 Regular blue-600 (17). The clamp is 5 lines —
// INFERRED: the frame's specimen text is exactly 5 lines with the link under it. Below `lg` the link is measured, like D2's ServiceDescription
// (ResizeObserver, before paint): it shows only when the text really overflows, so the short descriptions most products have get no dead link.
// From `lg` everything above holds unchanged (clamp 3, link always there).
export function ProductDescription({ description }: { description: string }) {
  const lang = useLang()
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let live = true
    const measure = () => {
      // Measured only while clamped: once expanded, scrollHeight equals clientHeight and would hide « Voir moins ».
      if (!live || !el.classList.contains('line-clamp-3')) return
      // A real overflow is at least one more 24 px line; Arabic / mixed-script line boxes can read a couple of px over the clamp on their own.
      setOverflows(el.scrollHeight - el.clientHeight > 8)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    // A web font that arrives after the first measure re-wraps the text WITHOUT resizing the clamped box.
    void document.fonts?.ready.then(measure)
    return () => {
      live = false
      observer.disconnect()
    }
  }, [description])

  return (
    <div className="flex flex-col gap-3 max-lg:gap-2">
      <p
        ref={ref}
        id="product-description"
        className={`whitespace-pre-line text-[15px] leading-[26px] text-text-secondary max-lg:leading-6 ${
          expanded ? '' : 'line-clamp-3 max-lg:line-clamp-5'
        }`}
      >
        {description}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="product-description"
        className={`w-fit rounded-md text-[15px] font-medium text-brand-blue-600 transition-colors hover:text-brand-blue-700 max-lg:text-sm max-lg:font-normal max-lg:leading-[17px] ${
          overflows || expanded ? '' : 'max-lg:hidden'
        } ${FOCUS_RING}`}
      >
        {t(expanded ? 'product.detail.see_less' : 'product.detail.see_more', lang)}
      </button>
    </div>
  )
}
