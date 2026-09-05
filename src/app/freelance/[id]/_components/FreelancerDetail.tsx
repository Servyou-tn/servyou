import Image from 'next/image'
import { MapPin, Calendar, Link2, GraduationCap, Award, Briefcase } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/marche/EmptyState'
import { ServiceListingCard } from '@/components/listings/ServiceListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'
import type { FreelancerDetailData } from '@/lib/marche/freelancer-detail'
import { LANGUAGES, PROFICIENCY_LEVELS } from '@/lib/freelancer/language-options'
import { t, tn, type Lang } from '@/lib/i18n'
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
// the original hero measurement, not invented. No platform icons: freelancer_links has no
// type/platform column (H3's own migration comment), so every link renders the same generic icon.
export function FreelancerDetail({
  freelancer,
  services,
  completedProjectCount,
  contactPhone,
  lang,
  isLoggedIn,
}: {
  freelancer: FreelancerDetailData
  services: ServiceListing[]
  completedProjectCount: number
  contactPhone: string | null
  lang: Lang
  isLoggedIn: boolean
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
    <div className="flex flex-col gap-8">
      {/* hero — banner (no backing column, always the placeholder gradient, same posture D3 takes
          when logo_url/banner_url is null) + avatar-ring overlap + identity */}
      <div className="relative flex flex-col items-start rounded-card border border-border-subtle bg-surface-base">
        <div className="h-[200px] w-full shrink-0 overflow-hidden rounded-t-xl bg-gradient-to-r from-[#5b57f2] to-brand-blue-600" />

        <div className="absolute start-6 top-[136px] size-32 rounded-full bg-surface-base p-1">
          <Avatar size="2xl" src={freelancer.avatarUrl} name={freelancer.fullName} decorative={false} className="size-full" />
        </div>

        <div className="flex w-full flex-col gap-6 px-6 pb-6 pt-[76px]">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold leading-[38px] tracking-[-0.64px] text-text-primary">{freelancer.fullName}</h1>
            {freelancer.headline && <p className="text-lg text-text-secondary">{freelancer.headline}</p>}
            <div className="flex flex-wrap gap-5 pt-1">
              {freelancer.city && (
                <span className="flex items-center gap-1.5 text-body-sm text-text-secondary">
                  <MapPin className="size-4" aria-hidden="true" />
                  {freelancer.city}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-body-sm text-text-secondary">
                <Calendar className="size-4" aria-hidden="true" />
                {formatMemberSince(freelancer.createdAt, lang)}
              </span>
            </div>
          </div>

          {/* trust-row — "nouveau" state only (founder ruling), + carried-over links segment */}
          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border-subtle bg-surface-base p-4">
            <div className="flex flex-col gap-1">
              <span className="w-fit rounded-full bg-brand-blue-50 px-3 py-1 text-caption font-semibold text-brand-blue-700">
                {t('freelance.public.new_badge', lang)}
              </span>
              <span className="text-caption text-text-muted">{t('freelance.public.no_reviews_yet', lang)}</span>
            </div>
            <div className="h-8 w-px bg-border-subtle" />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-text-primary">{completedProjectCount}</span>
              <span className="text-caption text-text-muted">{t('freelance.public.projects_delivered', lang)}</span>
            </div>
            <div className="h-8 w-px bg-border-subtle" />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-text-primary">{t('freelance.public.years_value', lang, { years: yearsExperience })}</span>
              <span className="text-caption text-text-muted">{t('freelance.public.years_experience', lang)}</span>
            </div>
            {freelancer.links.length > 0 && (
              <>
                <div className="h-8 w-px bg-border-subtle" />
                <div className="flex flex-wrap items-center gap-3">
                  {freelancer.links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-body-sm font-medium text-brand-blue-600 hover:underline"
                    >
                      <Link2 className="size-4" aria-hidden="true" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>

          <SectionNav sections={sections} />

          <ActionsRow
            freelancerProfileId={freelancer.profileId}
            freelancerName={freelancer.fullName}
            contactPhone={contactPhone}
            firstServiceId={firstServiceId}
            serviceCount={services.length}
            lang={lang}
            isLoggedIn={isLoggedIn}
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
      />

      {hasAbout && (
        <section id="a-propos" className="flex flex-col gap-4 rounded-card border border-border-subtle bg-surface-base p-6">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('freelance.public.about_title', lang)}</h2>
          <p className="max-w-[760px] whitespace-pre-line text-base leading-[26px] text-text-secondary">{freelancer.bio}</p>
        </section>
      )}

      {hasSkillsBlock && (
        <section id="competences" className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-6">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('freelance.public.skills_title', lang)}</h2>
          {freelancer.skills.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted">
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
              <p className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted">
                {t('freelance.public.languages_label', lang)}
              </p>
              <div className="flex flex-col gap-1.5">
                {freelancer.languages.map((row) => (
                  <div key={row.language} className="flex items-center gap-2 text-body-sm">
                    <span className="font-semibold text-text-primary">{languageLabel(row.language, lang)}</span>
                    <span className="text-text-muted">—</span>
                    <span className="text-text-secondary">{proficiencyLabel(row.proficiency, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {freelancer.tools.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
              <p className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted">
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
        <section id="portfolio" className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-6">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('freelance.public.portfolio_title', lang)}</h2>
            {freelancer.portfolioItems.length > 0 && (
              <span className="text-body-sm text-text-muted">{tn('freelance.public.portfolio_count', lang, freelancer.portfolioItems.length)}</span>
            )}
          </div>

          {freelancer.portfolioItems.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {freelancer.portfolioItems.map((item) => (
                <div key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-border-subtle">
                  <div className="relative h-[222px] w-full bg-surface-sunken">
                    <Image src={item.imageUrl} alt="" fill sizes="(max-width: 1023px) 100vw, 360px" className="object-cover" />
                  </div>
                  <div className="flex flex-col gap-1 p-4">
                    {item.title && <h3 className="text-base font-semibold text-text-primary">{item.title}</h3>}
                    {item.description && <p className="line-clamp-3 text-body-sm text-text-secondary">{item.description}</p>}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 w-fit text-caption font-medium text-brand-blue-600 hover:underline"
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
            <div className="flex items-center gap-2 border-t border-border-subtle pt-4 text-body-sm">
              <span className="text-text-secondary">{t('freelance.public.external_portfolio_label', lang)}</span>
              <a href={freelancer.portfolioLink} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-blue-600 hover:underline">
                {displayUrl(freelancer.portfolioLink)}
              </a>
            </div>
          )}
        </section>
      )}

      <section id="services" className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-6">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('freelance.public.services_title', lang)}</h2>
          <span className="text-body-sm text-text-muted">{tn('freelance.public.services_count', lang, services.length)}</span>
        </div>
        {services.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceListingCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Briefcase className="size-12" aria-hidden="true" />} message={t('freelance.public.empty_services', lang)} />
        )}
      </section>

      {hasFormation && (
        <section id="formation" className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-base p-6">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('freelance.public.formation_title', lang)}</h2>
          {freelancer.education.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted">
                {t('freelance.public.education_label', lang)}
              </p>
              {freelancer.education.map((row) => (
                <div key={row.id} className="flex items-start gap-3 rounded-lg bg-surface-sunken p-4">
                  <GraduationCap className="mt-0.5 size-5 shrink-0 text-text-muted" aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-base font-semibold text-text-primary">{row.institution}</span>
                    <span className="text-body-sm text-text-secondary">
                      {[row.degree, formatYearRange(row.yearStart, row.yearEnd)].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {freelancer.certifications.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
              <p className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted">
                {t('freelance.public.certifications_label', lang)}
              </p>
              {freelancer.certifications.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Award className="mt-0.5 size-5 shrink-0 text-text-muted" aria-hidden="true" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-base font-semibold text-text-primary">{row.name}</span>
                      <span className="text-body-sm text-text-secondary">
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
        <section id="contexte" className="flex flex-col gap-4 rounded-card border border-border-subtle bg-surface-base p-6">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{t('freelance.public.context_title', lang)}</h2>
          <div className="flex flex-col gap-3">
            {freelancer.workingHours?.trim() && (
              <div className="flex flex-col gap-1">
                <span className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted">
                  {t('freelance.public.working_hours_label', lang)}
                </span>
                <span className="whitespace-pre-line text-base text-text-primary">{freelancer.workingHours}</span>
              </div>
            )}
            {freelancer.workplaceLocation?.trim() && (
              <div className="flex flex-col gap-1">
                <span className="text-caption font-semibold uppercase tracking-[0.48px] text-text-muted">
                  {t('freelance.public.workplace_location_label', lang)}
                </span>
                <span className="text-base text-text-primary">{freelancer.workplaceLocation}</span>
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
