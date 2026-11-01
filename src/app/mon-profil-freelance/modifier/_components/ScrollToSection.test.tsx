// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import { ScrollToSection } from './ScrollToSection'

// jsdom has neither matchMedia nor scrollIntoView: the component must not throw on a browser (or a test) without them.
describe('ScrollToSection', () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0) as unknown as number)
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
    document.body.innerHTML = '<details id="realisations"></details><div id="photo"></div>'
    for (const el of Array.from(document.querySelectorAll('details, div'))) (el as HTMLElement).scrollIntoView = scrollIntoView
    scrollIntoView.mockClear()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('scrolls the named section to the top, smoothly by default', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    render(<ScrollToSection id="realisations" />)
    vi.runAllTimers()
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('jumps when the visitor prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    render(<ScrollToSection id="realisations" />)
    vi.runAllTimers()
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('does not throw without matchMedia / scrollIntoView, or when the element is missing', () => {
    document.body.innerHTML = ''
    expect(() => {
      render(<ScrollToSection id="liens" />)
      vi.runAllTimers()
    }).not.toThrow()
  })

  it('does not scroll to « photo » — it is the first block, already on screen', () => {
    render(<ScrollToSection id="photo" />)
    vi.runAllTimers()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
