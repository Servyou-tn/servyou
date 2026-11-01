'use client'

import { useEffect } from 'react'

// Brings the section the dashboard linked to (`?section=…`) into view once the page has rendered. The accordion itself is opened by the server render
// (AccordionSection `forceOpen`), so there is no state to set here — only a scroll, after layout settles. Reduced motion: jump, don't glide.
// `photo` is the FIRST block of the page and already on screen: scrolling to it would only push the page title out of view, so it does not scroll.
export function ScrollToSection({ id }: { id: string }) {
  useEffect(() => {
    if (id === 'photo') return
    const frame = requestAnimationFrame(() => {
      const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      document.getElementById(id)?.scrollIntoView?.({ behavior, block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [id])
  return null
}
