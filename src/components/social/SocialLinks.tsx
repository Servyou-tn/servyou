import { PlatformIcon } from './PlatformIcon'
import { FOCUS_RING } from '@/components/layout/styles'
import { detectPlatform, platformName } from '@/lib/social/platforms'
import { t, type Lang } from '@/lib/i18n'

// A row of clickable platform icons — the freelancer's links on the public profile (D4 hero) and anywhere else a profile's links are shown compactly.
// Each is a real link: opens in a new tab with `noopener noreferrer`, named « Profil {Platform} de {name} » (« Site web de {name} » for any other site),
// a visible focus ring, and a 44 px tap target on a phone (36 from `sm`). Brand glyphs are not mirrored in RTL; the row itself follows the direction.
export function SocialLinks({
  links,
  name,
  lang,
  className = '',
}: {
  links: readonly { id: string; url: string }[]
  /** The profile's name — what the link is « of ». */
  name: string
  lang: Lang
  className?: string
}) {
  if (links.length === 0) return null
  return (
    <ul className={`flex flex-wrap items-center gap-1 ${className}`}>
      {links.map((link) => {
        const platform = detectPlatform(link.url) ?? 'website'
        const label =
          platform === 'website'
            ? t('social.website_of', lang, { name })
            : t('social.profile_of', lang, { platform: platformName(platform, lang === 'ar' ? 'ar' : 'fr'), name })
        return (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className={`inline-flex size-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-subtle hover:text-brand-blue-600 sm:size-9 ${FOCUS_RING}`}
            >
              <PlatformIcon platform={platform} />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
