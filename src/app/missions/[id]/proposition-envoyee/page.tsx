import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle, Inbox, MessageCircle, Users } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { FOCUS_RING } from '@/components/layout/styles'
import { getSentProposal } from '@/lib/marche/sent-proposal-query'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveRole } from '@/lib/roles'
import { getLang } from '@/lib/i18n/server'
import { t, tn } from '@/lib/i18n'
import { SentRecap } from './_components/SentRecap'

export const metadata: Metadata = { title: 'Proposition envoyée — Servyou' }

// H13 « Proposition envoyée » — Figma 376:10511 (docs/design/h9-h13-measurements.md §4): ONE centred 640-wide column, gap 32 —
// hero · « CE QUE VOUS AVEZ ENVOYÉ » recap · « ET MAINTENANT ? » next steps · WhatsApp CTA + « Voir mes propositions ».
//
// Rendered from the PERSISTED response (refresh-safe, deep-linkable). A freelancer with no response on this post is sent back
// to the mission. The failure variants (post full / filled / expired / deleted, 5 active) are NOT routes: they render in place
// in H12 from the action's typed result (D-H13-3), so this page only ever shows success.
//
// Differences from the frame, all rulings: the « N autres freelances ont répondu » step reads response_count − 1 and is hidden
// at 0 (gap G3); the « c'est souvent ce qui fait la différence » clause is dropped (D-H12-1, an unsupported effectiveness
// claim); the price/délai row is sized to content, not the frame's FIXED 100 px cells (D-H13-1); the date is formatted in
// Africa/Tunis (D-H13-5).
export default async function PropositionEnvoyeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lang = await getLang()

  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(`/missions/${id}/proposition-envoyee`)}`)
  if (resolveRole(shell.topBarUser) !== 'freelancer') redirect(`/missions/${id}`)

  const sent = await getSentProposal(id, shell.id)
  if (!sent) redirect(`/missions/${id}`)

  const name = sent.clientFirstName || t('proposal.form.client_fallback', lang)
  const others = sent.mission ? Math.max(0, sent.mission.responseCount - 1) : 0

  return (
    <AppShell user={shell.topBarUser}>
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-24 items-center justify-center rounded-full bg-success-50">
            <CheckCircle className="size-14 text-success-500" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-h1 text-text-primary">{t('proposal.sent.title', lang)}</h1>
            <p className="text-body-lg text-text-muted">{t('proposal.sent.subtitle', lang, { name })}</p>
          </div>
        </div>

        <SentRecap sent={sent} lang={lang} />

        <section className="flex w-full flex-col gap-4 rounded-xl bg-brand-blue-50 p-6">
          <h2 className="text-caption font-semibold text-text-muted uppercase">{t('proposal.sent.next', lang)}</h2>
          <ul className="flex flex-col gap-3 text-body-sm text-text-secondary">
            <li className="flex items-start gap-3">
              <Inbox className="mt-0.5 size-5 shrink-0 text-brand-blue-600" aria-hidden="true" />
              {t('proposal.sent.step1', lang, { name })}
            </li>
            <li className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 size-5 shrink-0 text-brand-blue-600" aria-hidden="true" />
              {t('proposal.sent.step2', lang)}
            </li>
            {others > 0 ? (
              <li className="flex items-start gap-3">
                <Users className="mt-0.5 size-5 shrink-0 text-brand-blue-600" aria-hidden="true" />
                {tn('proposal.sent.step3', lang, others)}
              </li>
            ) : null}
          </ul>
        </section>

        <div className="flex w-full flex-col items-center gap-4">
          {sent.mission ? (
            <WhatsAppContactButton
              targetId={sent.mission.consumerId}
              size="md"
              label={t('proposal.sent.whatsapp', lang, { name })}
              message={t('proposal.sent.whatsapp_message', lang, { name, title: sent.mission.title })}
              errorMessageKey="proposal.sent.whatsapp_error"
              noPhoneMessageKey="proposal.sent.whatsapp_none"
            />
          ) : null}
          <Link href="/mes-propositions" className={`rounded-sm text-body-sm font-medium text-brand-blue-600 hover:underline ${FOCUS_RING}`}>
            {t('proposal.sent.mine', lang)}
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
