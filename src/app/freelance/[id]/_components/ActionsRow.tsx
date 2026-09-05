import { PrimaryCta } from './PrimaryCta'
import { FreelancerShareButton } from './FreelancerShareButton'
import { FreelancerReportModal } from './FreelancerReportModal'
import type { Lang } from '@/lib/i18n'

// Hero action row — PrimaryCta (WhatsApp or "Demander un service", see PrimaryCta.tsx for the
// branch) + Partager (badge cut, button kept) + Signaler (reports.target_type already carries
// 'freelancer_profile'). The sticky bar renders PrimaryCta alone, not this whole row — its own
// specimen (390:11097) has no Partager/Signaler.
export function ActionsRow({
  freelancerProfileId,
  freelancerName,
  contactPhone,
  firstServiceId,
  serviceCount,
  lang,
  isLoggedIn,
}: {
  freelancerProfileId: string
  freelancerName: string
  contactPhone: string | null
  firstServiceId: string | null
  serviceCount: number
  lang: Lang
  isLoggedIn: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PrimaryCta
        freelancerProfileId={freelancerProfileId}
        freelancerName={freelancerName}
        contactPhone={contactPhone}
        firstServiceId={firstServiceId}
        serviceCount={serviceCount}
        lang={lang}
        size="lg"
      />
      <FreelancerShareButton />
      <FreelancerReportModal freelancerProfileId={freelancerProfileId} freelancerName={freelancerName} isLoggedIn={isLoggedIn} />
    </div>
  )
}
