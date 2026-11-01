import Image from 'next/image'
import { MapPin, Calendar, GraduationCap, Award, Briefcase } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/marche/EmptyState'
import { ServiceListingCard } from '@/components/listings/ServiceListingCard'
import { SocialLinks } from '@/components/social/SocialLinks'
import { PlatformIcon } from '@/components/social/PlatformIcon'
import { detectPlatform } from '@/lib/social/platforms'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'
import type { FreelancerDetailData } from '@/lib/marche/freelancer-detail'
import { LANGUAGES, PROFICIENCY_LEVELS } from '@/lib/freelancer/language-options'
import { t, tn, type Lang } from '@/lib/i18n'
import { PublicServiceCard } from './PublicServiceCard'
import { ActionsRow } from './ActionsRow'
import { StickyBar } from './StickyBar'
import { SectionNav, type NavSection } from './SectionNav'

// D4 « Profil freelance public » — rebuilt from Figma 390:10676, measured in the D4 discovery
// pass. Single stacked column throughout, same skeleton as D3 (hero card + N boxes), but WITH a
// hero trust-row split D3 never had.
//
// CUT from this build (founder ruling): the 4.8★/12-avis trust-row state (no reviews table, ratings
// Phase 3+ — unreachable for every real freelancer today, so only the "nouveau" state is built);
// the "Verified" badge overlay (no verification concept anywhere in the schema); "Informations
// complémentaires" in Contexte (no column, same cut H3 already made); the Partager badge (kept the
// button, cut the "3" — copy-paste residue from the request-cta's real live-count badge, confirmed
// by the founder).
//
// TRUST-ROW LINKS — one deviation worth flagging: the founder's "nouveau" trust-block ruling names
// only 3 segments (pill+caption, projets livrés, années d'expérience). The measured "nouveau"
// specimen (390:11137, 439×111) draws only those 3. But the ORIGINAL hero measurement's trust-row
// (390:10694) is a 4-segment card — the 4th being freelancer_links (github/linkedin/site). Dropping
// links entirely would violate the locked D-H mirror (H3's "Confiance & liens" accordion edits
// them; D4 must show them somewhere) — so they're appended here as a 4th segment, carried over from
// the original hero measurement, not invented. Each link is its platform's icon (SocialLinks, the links kit:
// the platform is read from the address — freelancer_links has no platform column — and anything unknown is the globe).
//
// BELOW lg — the 375 frame (m375-d4-profil, docs/design/m375-d4-profil-deltas.md), as `max-lg:` overrides so 1440 is untouched: the hero and
// every box bleed to the screen edges (boxes keep r12 + their 1 px stroke; Figma strokes sit inside the frame, so a bordered box pads 1 px
// less to keep the frame's content box); banner 120, avatar ring 96 at 16 / 72; trust row 2 × 2; no section nav under the hero; group
// labels in sentence case; « Portfolio » / « Ses services » 24 Bold in border/strong boxes; flat portfolio pieces; the frame's own
// « ServiceCard / context=public » (PublicServiceCard); formation entries without icons. Kept on mobile by founder ruling (page 5): the
// sticky contact bar. The cuts above still hold at every width.
export function FreelancerDetail({
  freelancer,
  services,
  completedProjectCount,
  contactPhone,
  lang,
  isLoggedIn,
  isFavorited,
  pendingRequest = false,
}: {
  freelancer: FreelancerDetailData
  services: ServiceListing[]
  completedProjectCount: number | null
  contactPhone: string | null
  lang: Lang
  isLoggedIn: boolean
  isFavorited: boolean
  pendingRequest?: boolean
}) {
  const yearsExperience = freelancer.yearsExperience ?? 0
  const hasAbout = Boolean(freelancer.bio?.trim())
  const hasSkillsBlock = freelancer.skills.length > 0 || freelancer.languages.length > 0 || freelancer.tools.length > 0
  const hasPortfolio = freelancer.portfolioItems.length > 0 || Boolean(freelancer.portfolioLink)
  const hasFormation = freelancer.education.length > 0 || freelancer.certifications.length > 0
  const hasContext = Boolean(freelancer.workingHours?.trim()) || Boolean(freelancer.workplaceLocation?.trim())
  const firstServiceId = services[0]?.id ?? null

  const sections: NavSection[] = [
    hasAbout && { id: 'a-propos', label: t('freelance.public.nav_about', lang) },
    hasSkillsBlock && { id: 'competences', label: t('freelance.public.nav_skills', lang) },
    hasPortfolio && { id: 'portfolio', label: t('freelance.public.nav_portfolio', lang) },
    { id: 'services', label: t('freelance.public.nav_services', lang) },
    hasFormation && { id: 'formation', label: t('freelance.public.nav_formation', lang) },
    hasContext && { id: 'contexte', label: t('freelance.public.nav_context', lang) },
  ].filter((s): s is NavSection => Boolean(s))

  return (
    <div className="flex flex-col gap-8 max-lg:gap-4">
      {/* hero — banner (no backing column, always the placeholder gradient, same posture D3 takes
          when logo_url/banner_url is null) + avatar-ring overlap + identity */}
      <div className="relative flex flex-col items-start rounded-card border border-border-subtle bg-surface-base max-lg:-mx-4 max-lg:-mt-6 max-lg:rounded-none max-lg:border-0 md:max-lg:-mx-8 md:max-lg:-mt-8">
        <div className="h-[200px] w-full shrink-0 overflow-hidden rounded-t-xl bg-gradient-to-r from-[#5b57f2] to-brand-blue-600 max-lg:h-[120px] max-lg:rounded-none" />

        <div className="absolute start-6 top-[136px] size-32 rounded-full bg-surface-base p-1 max-lg:start-4 max-lg:top-[72px] max-lg:size-24 max-lg:p-2">
          <Avatar size="2xl" src={freelancer.avatarUrl} name={freelancer.fullName} decorative={false} className="size-full max-lg:[&_svg]:size-11" />
        </div>

        <div className="flex w-full flex-col gap-6 px-6 pb-6 pt-[76px] max-lg:gap-4 max-lg:px-4 max-lg:pb-0 max-lg:pt-16">
          <div className="flex flex-col gap-2 max-lg:gap-4">
            {/* name + headline are one group (name-grp, gap 6 at 375); the meta row sits 16 below it */}
            <div className="flex flex-col gap-2 max-lg:gap-1.5">
              <h1 className="text-3xl font-bold leading-[38px] tracking-[-0.64px] text-text-primary max-lg:text-h1 max-lg:leading-[38px]">{freelancer.fullName}</h1>
              {freelancer.headline && <p className="text-lg text-text-secondary">{freelancer.headline}</p>}
            </div>
            <div className="flex flex-wrap gap-5 pt-1 max-lg:pt-0">
              {freelancer.city && (
                <span className="flex items-center gap-1.5 text-body-sm text-text-secondary max-lg:text-text-muted">
                  <MapPin className="size-4" aria-hidden="true" />
                  {freelancer.city}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-body-sm text-text-secondary max-lg:text-text-muted">
                <Calendar className="size-4" aria-hidden="true" />
                {formatMemberSince(freelancer.createdAt, lang)}
              </span>
            </div>
          </div>

          {/* trust-row — "nouveau" state only (founder ruling), + carried-over links segment */}
          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border-subtle bg-surface-base p-4 max-lg:gap-y-3 max-lg:rounded-[10px] max-lg:px-5.75 max-lg:py-3.75">
            <div className="flex flex-col gap-1">
              <span className="w-fit rounded-full bg-brand-blue-50 px-3 py-1 text-caption font-semibold text-brand-blue-700">
                {t('freelance.public.new_badge', lang)}
              </span>
              <span className="text-caption text-text-muted max-lg:font-medium">{t('freelance.public.no_reviews_yet', lang)}</span>
            </div>
            {/* null = the count failed to load: hidden rather than a false « 0 » (loader-error-surfacing ruling 6) */}
            {completedProjectCount !== null && (
              <>
                <div className="h-8 w-px bg-border-subtle max-lg:h-10" />
                <div className="flex flex-col max-lg:gap-1">
                  <span className="text-xl font-bold text-text-primary max-lg:text-h2 max-lg:leading-[30px]">{completedProjectCount}</span>
                  <span className="text-caption text-text-muted max-lg:font-medium max-lg:lowercase">{t('freelance.public.projects_delivered', lang)}</span>
                </div>
              </>
            )}
            {/* at 375 the card wraps 2 × 2 (frame: c1 | c2 over c3 | c4) — this divider would open the second row, so it is dropped there */}
            <div className={`h-8 w-px bg-border-subtle max-lg:h-10 ${completedProjectCount !== null ? 'max-lg:hidden' : ''}`} />
            <div className="flex flex-col max-lg:gap-1">
              <span className="text-xl font-bold text-text-primary max-lg:text-h2 max-lg:leading-[30px]">{t('freelance.public.years_value', lang, { years: yearsExperience })}</span>
              <span className="text-caption text-text-muted max-lg:font-medium max-lg:lowercase">{t('freelance.public.years_experience', lang)}</span>
            </div>
            {freelancer.links.length > 0 && (
              <>
                <div className="h-8 w-px bg-border-subtle max-lg:h-10" />
                {/* c4-liens (m375-d4-profil): « Liens » caption 12 Medium muted over the 20 px text-secondary icons, gap 6. The icons keep their 34 px
                    tap target (20 + 7 each side) — the negative margins hand the padding back so the segment is as tall and as flush as the frame's. */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-caption font-medium text-text-muted">{t('freelance.public.links_label', lang)}</span>
                  <SocialLinks links={freelancer.links} name={freelancer.fullName} lang={lang} className="-my-1.75 -ms-1.75" />
                </div>
              </>
            )}
          </div>

          {/* the frame has no section nav under the hero — below lg only the sticky bar's CTA stays (founder ruling, page 5) */}
          <SectionNav sections={sections} className="max-lg:hidden" />

          <ActionsRow
            freelancerId={freelancer.id}
            isFavorited={isFavorited}
            freelancerProfileId={freelancer.profileId}
            freelancerName={freelancer.fullName}
            contactPhone={contactPhone}
            firstServiceId={firstServiceId}
            serviceCount={services.length}
            lang={lang}
            isLoggedIn={isLoggedIn}
            pendingRequest={pendingRequest}
          />
        </div>
      </div>

      <StickyBar
        freelancerProfileId={freelancer.profileId}
        freelancerName={freelancer.fullName}
        avatarUrl={freelancer.avatarUrl}
        sections={sections}
        contactPhone={contactPhone}
        firstServiceId={firstServiceId}
        serviceCount={services.length}
        lang={lang}
        pendingRequest={pendingRequest}
      />

      {hasAbout && (
        <section id="a-propos" className="flex flex-col gap-4 rounded-card border border-border-subtle bg-surface-base p-6 max-lg:-mx-4 max-lg:px-3.75 max-lg:py-4.75 md:max-lg:-mx-8">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('freelance.public.about_title', lang)}</h2>
          {/* paragraphs (a blank line is a paragraph break): 14 apart at 375 (line 27), a blank line's worth (26) from lg, so the desktop text is unchanged */}
          <div className="flex max-w-[760px] flex-col gap-3.5 lg:gap-[26px]">
            {(freelancer.bio ?? '').split(/\n\s*\n/).map((paragraph, i) => (
              <p key={i} className="whitespace-pre-line text-base leading-[26px] text-text-secondary max-lg:leading-[27px]">{paragraph.trim()}</p>
            ))}
          </div>
        </section>
      )}

      {hasSkillsBlock && (
        <section id="competences" className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-6 max-lg:gap-4 max-lg:-mx-4 max-lg:px-3.75 max-lg:py-4.75 md:max-lg:-mx-8">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('freelance.public.skills_title', lang)}</h2>
          {freelancer.skills.length > 0 && (
            <div className="flex flex-col gap-2 max-lg:gap-2.5">
              <p className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted max-lg:normal-case max-lg:tracking-normal">
                {t('freelance.public.skills_label', lang)}
              </p>
              <div className="flex flex-wrap gap-2">
                {freelancer.skills.map((skill) => (
                  <span key={skill} className="rounded-md bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {freelancer.languages.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
              <p className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted max-lg:normal-case max-lg:tracking-normal">
                {t('freelance.public.languages_label', lang)}
              </p>
              <div className="flex flex-col gap-1.5 max-lg:gap-2">
                {freelancer.languages.map((row) => (
                  <div key={row.language} className="flex items-center gap-2 text-body-sm max-lg:gap-1.5">
                    <span className="font-semibold text-text-primary">{languageLabel(row.language, lang)}</span>
                    <span className="text-text-muted">—</span>
                    <span className="text-text-secondary max-lg:-ms-0.5 max-lg:text-text-muted">{proficiencyLabel(row.proficiency, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {freelancer.tools.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border-subtle pt-4 max-lg:gap-2.5">
              <p className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted max-lg:normal-case max-lg:tracking-normal">
                {t('freelance.public.tools_label', lang)}
              </p>
              <div className="flex flex-wrap gap-2">
                {freelancer.tools.map((tool) => (
                  <span key={tool} className="rounded-md bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {hasPortfolio && (
        <section id="portfolio" className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-6 max-lg:border-border-strong max-lg:-mx-4 max-lg:px-3.75 max-lg:py-4.75 md:max-lg:-mx-8">
          <div className="flex items-baseline gap-2 max-lg:items-center">
            <h2 className="text-xl font-semibold leading-[26px] text-text-primary max-lg:text-h2 max-lg:font-bold max-lg:leading-[30px]">{t('freelance.public.portfolio_title', lang)}</h2>
            {freelancer.portfolioItems.length > 0 && (
              <span className="text-body-sm text-text-muted max-lg:text-caption max-lg:font-medium">{tn('freelance.public.portfolio_count', lang, freelancer.portfolioItems.length)}</span>
            )}
          </div>

          {freelancer.portfolioItems.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {freelancer.portfolioItems.map((item) => (
                <div key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-border-subtle max-lg:gap-2 max-lg:overflow-visible max-lg:rounded-none max-lg:border-0">
                  <div className="relative h-[222px] w-full overflow-hidden bg-surface-sunken max-lg:h-40 max-lg:rounded-[10px]">
                    <Image src={item.imageUrl} alt="" fill sizes="(max-width: 1023px) 100vw, 360px" className="object-cover" />
                  </div>
                  <div className="flex flex-col gap-1 p-4 max-lg:contents">
                    {item.title && <h3 className="text-base font-semibold text-text-primary max-lg:leading-[22px]">{item.title}</h3>}
                    {item.description && <p className="line-clamp-3 text-body-sm text-text-secondary max-lg:text-text-muted">{item.description}</p>}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 w-fit text-caption font-medium text-brand-blue-600 hover:underline max-lg:mt-0"
                      >
                        {t('freelance.public.view_project', lang)}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {freelancer.portfolioLink && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4 text-body-sm max-lg:gap-1 max-lg:border-t-0 max-lg:pt-0">
              <span className="text-text-secondary max-lg:text-text-muted">{t('freelance.public.external_portfolio_label', lang)}</span>
              <a
                href={freelancer.portfolioLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-medium text-brand-blue-600 hover:underline"
              >
                <PlatformIcon platform={detectPlatform(freelancer.portfolioLink) ?? 'website'} className="size-4 shrink-0" />
                {displayUrl(freelancer.portfolioLink)}
              </a>
            </div>
          )}
        </section>
      )}

      <section id="services" className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-6 max-lg:border-border-strong max-lg:-mx-4 max-lg:px-3.75 max-lg:py-4.75 md:max-lg:-mx-8">
        <div className="flex items-baseline gap-2 max-lg:items-center">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary max-lg:text-h2 max-lg:font-bold max-lg:leading-[30px]">{t('freelance.public.services_title', lang)}</h2>
          <span className="text-body-sm text-text-muted max-lg:text-caption max-lg:font-medium">{tn('freelance.public.services_count', lang, services.length)}</span>
        </div>
        {services.length > 0 ? (
          <>
            {/* below lg: the frame's « ServiceCard / context=public » (44 px band, no CTA) — from lg the v3.7 grid card, unchanged */}
            <div className="flex flex-col gap-4 lg:hidden">
              {services.map((service) => (
                <PublicServiceCard key={service.id} service={service} freelancerName={freelancer.fullName} freelancerAvatarUrl={freelancer.avatarUrl} lang={lang} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 max-lg:hidden">
              {services.map((service) => (
                <ServiceListingCard key={service.id} service={service} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState icon={<Briefcase className="size-12" aria-hidden="true" />} message={t('freelance.public.empty_services', lang)} />
        )}
      </section>

      {hasFormation && (
        <section id="formation" className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-6 max-lg:gap-4 max-lg:-mx-4 max-lg:px-3.75 max-lg:py-4.75 md:max-lg:-mx-8">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('freelance.public.formation_title', lang)}</h2>
          {freelancer.education.length > 0 && (
            <div className="flex flex-col gap-3 max-lg:gap-2">
              <p className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted max-lg:normal-case max-lg:tracking-normal">
                {t('freelance.public.education_label', lang)}
              </p>
              {freelancer.education.map((row) => (
                <div key={row.id} className="flex items-start gap-3 rounded-lg bg-surface-sunken p-4 max-lg:bg-surface-subtle max-lg:px-4 max-lg:py-3.5">
                  <GraduationCap className="mt-0.5 size-5 shrink-0 text-text-muted max-lg:hidden" aria-hidden="true" />
                  <div className="flex flex-col gap-0.5 max-lg:gap-0.75">
                    <span className="text-base font-semibold text-text-primary max-lg:leading-[22px]">{row.institution}</span>
                    <span className="text-body-sm text-text-secondary max-lg:text-text-muted">
                      {[row.degree, formatYearRange(row.yearStart, row.yearEnd)].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {freelancer.certifications.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 max-lg:gap-2 max-lg:border-0 max-lg:pt-0">
              <p className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted max-lg:normal-case max-lg:tracking-normal">
                {t('freelance.public.certifications_label', lang)}
              </p>
              {freelancer.certifications.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3 max-lg:flex-col max-lg:justify-start max-lg:gap-0 max-lg:rounded-lg max-lg:bg-surface-subtle max-lg:px-4 max-lg:py-3.5">
                  <div className="flex items-start gap-3">
                    <Award className="mt-0.5 size-5 shrink-0 text-text-muted max-lg:hidden" aria-hidden="true" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-base font-semibold text-text-primary max-lg:leading-[22px]">{row.name}</span>
                      <span className="text-body-sm text-text-secondary max-lg:text-text-muted">
                        {[row.issuingOrg, row.yearObtained ? String(row.yearObtained) : null].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </div>
                  {row.credentialUrl && (
                    <a
                      href={row.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-body-sm font-medium text-brand-blue-600 hover:underline"
                    >
                      {t('freelance.public.view_certificate', lang)}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {hasContext && (
        <section id="contexte" className="flex flex-col gap-4 rounded-card border border-border-subtle bg-surface-base p-6 max-lg:-mx-4 max-lg:px-3.75 max-lg:py-4.75 md:max-lg:-mx-8">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('freelance.public.context_title', lang)}</h2>
          <div className="flex flex-col gap-3 max-lg:gap-4">
            {freelancer.workingHours?.trim() && (
              <div className="flex flex-col gap-1">
                <span className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted max-lg:normal-case max-lg:tracking-normal">
                  {t('freelance.public.working_hours_label', lang)}
                </span>
                <span className="whitespace-pre-line text-base text-text-primary max-lg:leading-[26px]">{freelancer.workingHours}</span>
              </div>
            )}
            {freelancer.workplaceLocation?.trim() && (
              <div className="flex flex-col gap-1">
                <span className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted max-lg:normal-case max-lg:tracking-normal">
                  {t('freelance.public.workplace_location_label', lang)}
                </span>
                <span className="text-base text-text-primary max-lg:leading-[26px]">{freelancer.workplaceLocation}</span>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function formatMemberSince(iso: string, lang: Lang): string {
  const date = new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', { month: 'long', year: 'numeric' })
  return t('freelance.public.member_since', lang, { date })
}

function formatYearRange(start: number | null, end: number | null): string | null {
  if (!start && !end) return null
  if (start && end) return `${start} – ${end}`
  return String(start ?? end)
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

// freelancer_languages stores codes ('fr','ar','en',...), not display labels — H3's own repeater
// reads the same LANGUAGES/PROFICIENCY_LEVELS option lists to render its <select>s. Falls back to
// the raw code only for a value outside the known list (never silently blank).
function languageLabel(code: string, lang: Lang): string {
  const found = LANGUAGES.find((l) => l.value === code)
  return found ? (lang === 'ar' ? found.ar : found.fr) : code
}
function proficiencyLabel(code: string, lang: Lang): string {
  const found = PROFICIENCY_LEVELS.find((p) => p.value === code)
  return found ? (lang === 'ar' ? found.ar : found.fr) : code
}
