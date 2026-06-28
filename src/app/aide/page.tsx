import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MessageCircle, ChevronDown } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

export const metadata: Metadata = { title: "Centre d'aide — Servyou" }

// Help center (PR-DS-2) — a real, minimal FAQ (5 Tunisia-context entries) + a WhatsApp-framed
// support CTA. The CTA points to /contact for now (interim); the real Servyou support WhatsApp
// number is a logged follow-up. WhatsApp brand green (#25D366) is the documented exception to the
// no-hex rule — there is no design-system token for a third-party brand colour.
export default async function AidePage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')
  const lang = await getLang()
  const faqs = [1, 2, 3, 4, 5].map((n) => ({
    q: t(`aide.faq.q${n}`, lang),
    a: t(`aide.faq.a${n}`, lang),
  }))

  return (
    <AppShell user={shell.topBarUser}>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-h1 text-text-primary">{t('aide.title', lang)}</h1>
        <p className="mt-1 text-body text-text-muted">{t('aide.subtitle', lang)}</p>

        <div className="mt-6 space-y-3">
          {faqs.map((f, i) => (
            <details
              key={i}
              className="group rounded-card border border-border-subtle bg-white p-4 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded text-label font-medium text-text-primary',
                  FOCUS_RING,
                )}
              >
                <span>{f.q}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-body-sm text-text-secondary">{f.a}</p>
            </details>
          ))}
        </div>

        <Link
          href="/contact"
          className={cn(
            'mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-base font-semibold text-text-primary shadow-md transition-colors hover:bg-[#1DA851]',
            FOCUS_RING,
          )}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          {t('aide.contactWhatsApp', lang)}
        </Link>
      </div>
    </AppShell>
  )
}
