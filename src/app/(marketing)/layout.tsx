import { getLang } from '@/lib/i18n/server'
import { MarketingShell } from '@/components/layout/MarketingShell'

// Route-group layout for the public marketing content pages (/a-propos, /contact, /faq).
// Wraps them in the shared marketing chrome (Header + Footer). The landing page (/) is
// NOT in this group — its `/` route carries the logged-in-consumer auth branch, which
// must render the marche shell (its own top bar), not this marketing chrome.
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang()
  return <MarketingShell lang={lang}>{children}</MarketingShell>
}
