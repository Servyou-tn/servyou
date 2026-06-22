import type { ReactNode } from 'react'
import type { Lang } from '@/lib/i18n'
import { Header } from './Header'
import { Footer } from './Footer'

// The public marketing chrome — sticky Header on top, shared navy Footer at the bottom,
// page content in between. Used by the (marketing) route group (a-propos / contact / faq).
// The landing page composes the same Header + Footer through its own branch (it ends in
// FinalCtaFooter, which carries the Footer), so it doesn't go through this shell.
export function MarketingShell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <>
      <Header sellerType={null} fullName={null} forceShow />
      <main className="bg-surface-base">{children}</main>
      <Footer lang={lang} />
    </>
  )
}
