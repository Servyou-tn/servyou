'use client'

import { useEffect, useRef, useState } from 'react'
import { FOCUS_RING } from '@/components/layout/styles'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// D2's `descSection` at 375 (m375-d2-service): the text at 15/24 clamped to 8 lines (192), gap 8, « Voir plus » 14 Regular brand-blue-600 (17).
// From `lg` the text is shown whole, as D2's desktop layout always has — no clamp, no button.
//
// The button is rendered ONLY when the text really overflows its clamp: that depends on the box width and the font, so it is measured, by a
// ResizeObserver (its first callback runs right after observe, before paint — and again on a rotate / resize). A short description therefore never
// shows a « Voir plus » that expands nothing. `whitespace-pre-line` keeps the seller's own line breaks (the frame's blank line between paragraphs).
export function ServiceDescription({ text }: { text: string }) {
  const lang = useLang()
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let live = true
    const measure = () => {
      // Measured only while clamped: once expanded, scrollHeight equals clientHeight and would hide the « Voir moins ».
      if (!live || !el.classList.contains('line-clamp-8')) return
      // A real overflow is at least one more 24 px line; Arabic / mixed-script line boxes can read a couple of px over the clamp on their own.
      setOverflows(el.scrollHeight - el.clientHeight > 8)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    // A web font that arrives after the first measure re-wraps the text WITHOUT resizing the clamped box, so the observer alone would miss it.
    void document.fonts?.ready.then(measure)
    return () => {
      live = false
      observer.disconnect()
    }
  }, [text])

  return (
    <div className="flex flex-col gap-2">
      <p
        ref={ref}
        id="service-description"
        className={`whitespace-pre-line text-[15px] leading-6 text-text-secondary ${expanded ? '' : 'line-clamp-8 lg:line-clamp-none'}`}
      >
        {text}
      </p>
      {overflows || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="service-description"
          className={`w-fit rounded-md text-sm leading-[17px] text-brand-blue-600 transition-colors hover:text-brand-blue-700 lg:hidden ${FOCUS_RING}`}
        >
          {t(expanded ? 'serviceDetail.showLess' : 'serviceDetail.showMore', lang)}
        </button>
      ) : null}
    </div>
  )
}
