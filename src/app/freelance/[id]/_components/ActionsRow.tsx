import { PrimaryCta } from './PrimaryCta'
import { FreelancerShareButton } from './FreelancerShareButton'
import { FreelancerReportModal } from './FreelancerReportModal'
import { FavoriteHeart } from '@/components/favorites/FavoriteHeart'
import type { Lang } from '@/lib/i18n'

// Hero action row — PrimaryCta (WhatsApp or "Demander un service", see PrimaryCta.tsx for the
// branch) + Partager (badge cut, button kept) + Signaler (reports.target_type already carries
// 'freelancer_profile'). The sticky bar renders PrimaryCta alone, not this whole row — its own
// specimen (390:11097) has no Partager/Signaler.
export function ActionsRow({
  freelancerId,
  isFavorited,
  freelancerProfileId,
  freelancerName,
  contactPhone,
  firstServiceId,
  serviceCount,
  lang,
  isLoggedIn,
  pendingRequest = false,
}: {
  /** freelancer_profiles.id — the route id and the favorites target (NOT `freelancerProfileId`, which is profiles.id). */
  freelancerId: string
  isFavorited: boolean
  freelancerProfileId: string
  freelancerName: string
  contactPhone: string | null
  firstServiceId: string | null
  serviceCount: number
  lang: Lang
  isLoggedIn: boolean
  pendingRequest?: boolean
}) {
  return (
    // 375 frame: rows 8 apart when it wraps (CTA, then Partager + the ⋮), 8 above and below.
    <div className="flex flex-wrap items-center gap-3 max-lg:gap-y-2 max-lg:py-2">
      <PrimaryCta
        freelancerProfileId={freelancerProfileId}
        freelancerName={freelancerName}
        contactPhone={contactPhone}
        firstServiceId={firstServiceId}
        serviceCount={serviceCount}
        lang={lang}
        size="lg"
        pendingRequest={pendingRequest}
      />
      {/* Added at the founder's request (B6): 390:10676 draws hearts only on the service thumbnails. */}
      <FavoriteHeart kind="freelancer" targetId={freelancerId} name={freelancerName} initialFavorited={isFavorited} isLoggedIn={isLoggedIn} />
      <FreelancerShareButton />
      <FreelancerReportModal freelancerProfileId={freelancerProfileId} freelancerName={freelancerName} isLoggedIn={isLoggedIn} />
    </div>
  )
}
