'use client'

import { useState } from 'react'
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

export function ProductDescription({ description }: { description: string }) {
  const lang = useLang()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <p
        className={`whitespace-pre-line text-[15px] leading-[26px] text-text-secondary ${
          expanded ? '' : 'line-clamp-3'
        }`}
      >
        {description}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`w-fit rounded-md text-[15px] font-medium text-brand-blue-600 transition-colors hover:text-brand-blue-700 ${FOCUS_RING}`}
      >
        {t(expanded ? 'product.detail.see_less' : 'product.detail.see_more', lang)}
      </button>
    </div>
  )
}
