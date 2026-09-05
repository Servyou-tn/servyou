import Link from 'next/link'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

// D4's primary conversion CTA — reversed founder ruling: BOTH states, branching on
// get_contact_phone (resolved server-side, page.tsx). Returns null for every first-time visitor
// by design (get_contact_phone's own relationship gate: owner, shared order, or shared
// job_response) — that is the common case this page serves, so "Demander un service" is the
// primary, not a fallback. Returns a phone once a request exists, at which point WhatsApp
// coordination is correct. Neither branch is a new relationship concept: get_contact_phone already
// encodes this distinction.
//
// Shared by the hero's ActionsRow and StickyBar (390:10694 / 390:11097 both draw the same CTA) so
// the branch and its copy cannot drift between the two mount points.
//
// ZERO-DESTINATION CASE — raised during the build, then DISPROVEN by
// d4-freelancer-services-visibility.test.ts: admin_hide_content() always sets status='hidden' in
// the SAME statement as admin_hidden_at (confirmed by reading its body and by the live test), and
// trg_sync_freelancer_is_published watches status — so admin-hiding a freelancer's sole listing
// flips is_published to false in the same trigger pass and the whole page 404s. It never renders
// with contactPhone=null AND firstServiceId=null simultaneously through any path this app takes.
// This branch is kept anyway as a harmless defensive fallback (no specimen draws a disabled CTA,
// so rendering nothing is the safe default if the premise is ever wrong), not because the scenario
// is real today.
export function PrimaryCta({
  freelancerProfileId,
  freelancerName,
  contactPhone,
  firstServiceId,
  serviceCount,
  lang,
  size = 'lg',
}: {
  freelancerProfileId: string
  freelancerName: string
  contactPhone: string | null
  firstServiceId: string | null
  serviceCount: number
  lang: Lang
  size?: 'sm' | 'lg'
}) {
  if (contactPhone) {
    return (
      <WhatsAppContactButton
        targetId={freelancerProfileId}
        message={t('freelance.public.whatsapp_message', lang, { name: freelancerName })}
        label={t('freelance.public.whatsapp_cta', lang)}
        size={size}
        errorMessageKey="freelance.public.phone_reveal_error"
        noPhoneMessageKey="freelance.public.no_phone"
      />
    )
  }
  if (firstServiceId) {
    return (
      <Link href={`/demander/${firstServiceId}`} className={cn(BUTTON_BASE, BUTTON_SIZE[size], VARIANT_BASE.primary, VARIANT_STATE.primary)}>
        {t('freelance.public.request_service_cta', lang)}
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-caption font-semibold">
          {serviceCount}
        </span>
      </Link>
    )
  }
  return null
}
