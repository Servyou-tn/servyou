import * as React from 'react'

// « Leaving with unsaved changes » for the H7 edit wizard (docs/design/h7-deltas.md, D37). The codebase has
// no such pattern yet — G7 / H3 only show a « Modifications non enregistrées » caption — so this is the
// smallest one that covers the exits a freelancer actually takes:
//   • closing / reloading the tab, or typing another address → the browser's own beforeunload prompt;
//   • clicking any in-app link (breadcrumb, sidebar, « Mes services ») → the same window.confirm the
//     admin buttons use, intercepted before Next's <Link> handler navigates.
// NOT covered: the browser Back button (App Router exposes no blocker) — a known gap, noted in the PR.
//
// `isDirty` is a getter, not a boolean, so the listeners stay registered once and always read the latest
// value (a save clears it just before it navigates away on purpose).

export function useLeaveGuard(isDirty: () => boolean, message: string) {
  const isDirtyRef = React.useRef(isDirty)
  const messageRef = React.useRef(message)
  React.useEffect(() => {
    isDirtyRef.current = isDirty
    messageRef.current = message
  })

  React.useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirtyRef.current()) return
      e.preventDefault()
      e.returnValue = ''
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (!isDirtyRef.current()) return
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      // Same page (a #fragment, or the current URL): nothing is being left.
      if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search) return
      if (!window.confirm(messageRef.current)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    // Capture: runs before the React root sees the click, so declining stops Next's navigation.
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [])
}
