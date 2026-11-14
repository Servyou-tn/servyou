'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useConsent } from '@/components/consent/CookieConsent'
import {
  UMAMI_BEFORE_SEND,
  UMAMI_SCRIPT_URL,
  filterUmamiPayload,
  isExcludedPath,
  umamiScriptAttributes,
  type UmamiPayload,
} from '@/lib/analytics/umami'

// The Umami tracker (lib/analytics/umami.ts). The root layout mounts this ONLY in production; here it renders the script only after the
// visitor said yes to « Mesure d'audience » (accepting in the banner loads it at once, no reload) and never on an admin page.
//
// The before-send filter is installed at MODULE scope: this runs when the chunk is evaluated, before the component renders, so before
// next/script injects the tracker (afterInteractive = after hydration). The tracker looks the function up by name on every send and
// sends UNFILTERED when it is missing — it has to exist before the first pageview.
if (typeof window !== 'undefined') {
  Object.assign(window, {
    [UMAMI_BEFORE_SEND]: (_type: string, payload: UmamiPayload) => filterUmamiPayload(payload, document.cookie),
  })
}

export function UmamiScript() {
  const pathname = usePathname()
  const { hasConsent } = useConsent()
  if (!hasConsent('audience') || isExcludedPath(pathname)) return null
  return <Script id="umami" src={UMAMI_SCRIPT_URL} strategy="afterInteractive" {...umamiScriptAttributes()} />
}
