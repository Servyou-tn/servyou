'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  consentCookieString,
  hasConsent as consentGranted,
  makeConsent,
  type Consent,
  type ConsentCategory,
} from '@/lib/consent/consent'
import { CookieBanner } from './CookieBanner'
import { CookieSettingsModal } from './CookieSettingsModal'

// A7 — the consent state, the banner and the « Personnaliser » modal. Mounted ONCE by the root layout with the cookie the SERVER read, so the
// banner is in the first HTML (or absent) — no flash. The banner is a card at the bottom of the page, not an overlay: the page stays usable.
// The modal is opened by « Personnaliser » and by « Gérer les cookies » in the footer (withdrawing is as easy as giving).
//
// `useConsent().hasConsent('audience')` is the one client-side question future analytics must ask before it loads anything; the server-side
// twin is lib/consent/server.ts. Both answer false until the visitor has explicitly said yes, and again after the choice expires.

type ConsentValue = {
  /** The stored, still-valid choice — null when the visitor has not chosen (or it expired). */
  consent: Consent | null
  hasConsent: (category: ConsentCategory) => boolean
  /** Opens the settings modal (the footer's « Gérer les cookies »). */
  openSettings: () => void
}

// Outside the provider (Storybook, a unit render of the footer) nothing is granted and the link is inert, rather than a crash.
const ConsentContext = createContext<ConsentValue>({ consent: null, hasConsent: () => false, openSettings: () => {} })

export function useConsent(): ConsentValue {
  return useContext(ConsentContext)
}

export function CookieConsentProvider({ initial, children }: { initial: Consent | null; children: ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(initial)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const save = useCallback((audience: boolean) => {
    const next = makeConsent(audience)
    document.cookie = consentCookieString(next, window.location.protocol === 'https:')
    setConsent(next)
    setSettingsOpen(false)
  }, [])
  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const value = useMemo<ConsentValue>(
    () => ({ consent, hasConsent: (category) => consentGranted(consent, category), openSettings }),
    [consent, openSettings],
  )

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {consent === null && !settingsOpen ? <CookieBanner onAcceptAll={() => save(true)} onRefuseAll={() => save(false)} onCustomize={openSettings} /> : null}
      {settingsOpen ? (
        <CookieSettingsModal initialAudience={consent?.audience ?? false} onSave={save} onClose={closeSettings} />
      ) : null}
    </ConsentContext.Provider>
  )
}
