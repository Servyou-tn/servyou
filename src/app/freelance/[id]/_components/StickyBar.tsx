import { Avatar } from '@/components/ui/avatar'
import { PrimaryCta } from './PrimaryCta'
import { SectionNav, type NavSection } from './SectionNav'
import type { Lang } from '@/lib/i18n'

// D4's sticky CTA bar (measured specimen 390:11097) — CSS position:sticky, no scroll listener.
// Placed once in the DOM right after the hero: at its natural flow position it renders inline and
// invisible-by-scroll-position; once that position passes under the topbar it sticks and stays
// docked for the rest of the page. This is what "appears on scroll" means here — no JS, no
// hydration flash, no scroll-jank.
//
// TOP OFFSET IS RESPONSIVE, NOT A FLAT top-16 — Topbar.tsx's own row structure has TWO heights:
// h-16 (64px) at md+ where the search bar is inline, but below md the search drops to its own full
// row (px-4 pb-3 wrapping a TopbarSearch h-10 input — TopbarSearch.tsx) adding 40+12+1(border)=53px,
// for 117px total. Caught by an actual CDP measurement during D4's build: a flat top-16 left the
// bar's name/avatar cluster sitting UNDER the topbar's second row on a 375px viewport. No other
// sticky-below-the-topbar element exists elsewhere in this app to have surfaced this first.
export function StickyBar({
  freelancerProfileId,
  freelancerName,
  avatarUrl,
  sections,
  contactPhone,
  firstServiceId,
  serviceCount,
  lang,
}: {
  freelancerProfileId: string
  freelancerName: string
  avatarUrl: string | null
  sections: NavSection[]
  contactPhone: string | null
  firstServiceId: string | null
  serviceCount: number
  lang: Lang
}) {
  return (
    <div className="sticky top-[117px] z-20 -mx-4 border-b border-border-subtle bg-surface-base px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:-mx-6 sm:px-6 md:top-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="sm" src={avatarUrl} name={freelancerName} />
          <span className="truncate text-body-sm font-semibold text-text-primary">{freelancerName}</span>
        </div>
        <SectionNav sections={sections} className="hidden lg:flex" />
        <PrimaryCta
          freelancerProfileId={freelancerProfileId}
          freelancerName={freelancerName}
          contactPhone={contactPhone}
          firstServiceId={firstServiceId}
          serviceCount={serviceCount}
          lang={lang}
          size="sm"
        />
      </div>
    </div>
  )
}
