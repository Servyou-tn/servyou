import Image from 'next/image'
import Link from 'next/link'
import { Check, ChevronDown, MapPin, Search } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { ButtonLink } from './ui'
import { SMarkBackdrop } from './SMarkBackdrop'

// Hero — Figma « HERO PROPOSAL » (desktop 1741:51431, phone 1740:37951): blue box + H1 + subheadline +
// search bar + « Populaire » chips + 2 CTAs + reassurance line, and the 3-photo pyramid over a big
// white S-mark (20 % fill, 100 % white outline).
// Desktop: 1392-wide box (r32), text column 80 in / 95 down; rhythm 24 · 24 · 16 · 24 · 20, 64 bottom.
//          Pyramid 399² at 129 down, 122 from the end edge; the S (515×560) sits 18 / 102 up-left of it.
// Phone:   359-wide box (r24), 20 in / 36 down; same rhythm (18 under the H1); pyramid 220² 92 under
//          the reassurance, S (276×300) 16 / 60 up-left of it, 48 bottom.
// Box ≥ 657 tall (the Figma height) so the S never clips when the Arabic H1 is shorter.
// 1024–1439: the pyramid + S scale down (0.8, 0.9) from the end edge so they never reach the search bar.
const PHOTOS = [
  // [src, desktop x/y in the 399 group, phone x/y in the 220 group]
  { src: '/brand/landing/owner.webp', d: 'lg:start-[146px] lg:top-0', p: 'start-[81px] top-0' },
  { src: '/brand/landing/free.webp', d: 'lg:start-0 lg:top-[146px]', p: 'start-0 top-[81px]' },
  { src: '/brand/landing/client.webp', d: 'lg:start-[199px] lg:top-[199px]', p: 'start-[110px] top-[110px]' },
] as const

// « Populaire » chips → the matching category pages (same routes as the Catégories cards).
const CHIPS = [
  { key: 'logo', href: '/categories/design-graphique-logo' },
  { key: 'reels', href: '/categories/montage-video-motion' },
  { key: 'web', href: '/categories/developpement-web-mobile' },
  { key: 'mode', href: '/categories/mode' },
] as const

const REASSURANCE = ['lp.beta', 'lp.hero.reassure.cod', 'lp.hero.reassure.local'] as const

export function Hero({ lang, cities }: { lang: Lang; cities: string[] }) {
  return (
    <section className="relative mx-2 mt-0.5 overflow-hidden rounded-3xl bg-brand-blue-500 px-5 pt-9 pb-12 lg:mx-6 lg:mt-4 lg:min-h-[657px] lg:rounded-[32px] lg:px-20 lg:pt-[95px] lg:pb-16">
      <div className="relative z-10 lg:max-w-[520px] xl:max-w-[660px]">
        <h1 className="text-[32px] leading-[38px] font-bold tracking-[-0.02em] text-text-inverse lg:text-[44px] lg:leading-[46px] lg:font-black rtl:tracking-normal">
          {t('lp.hero.title', lang)}
        </h1>
        <p className="mt-[18px] max-w-[580px] text-lg leading-7 text-text-inverse lg:mt-6">{t('lp.hero.subtitle', lang)}</p>

        <HeroSearch lang={lang} cities={cities} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[13px] leading-5 font-medium text-text-inverse/85 lg:text-sm lg:leading-[21px]">
            {t('lp.hero.popular', lang)}
          </span>
          {CHIPS.map(c => (
            <Link
              key={c.key}
              href={c.href}
              className={cn(
                'inline-flex items-center rounded-full border border-text-inverse/35 bg-text-inverse/14 px-3 py-[5px] text-[13px] leading-5 font-medium text-text-inverse transition-colors hover:bg-text-inverse/25 motion-reduce:transition-none lg:px-3.5 lg:py-1.5 lg:text-sm lg:leading-[21px]',
                FOCUS_RING,
              )}
            >
              {t(`lp.hero.chip.${c.key}`, lang)}
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:gap-4">
          <ButtonLink href="/inscription" variant="white" className="h-[52px] text-text-primary lg:h-12">
            {t('lp.cta.start', lang)}
          </ButtonLink>
          <ButtonLink href="#comment-ca-marche" variant="outline-white" className="h-[52px] lg:h-12">
            {t('lp.cta.how', lang)}
          </ButtonLink>
        </div>

        <ul className="mt-5 flex flex-col gap-2 lg:flex-row lg:gap-5">
          {REASSURANCE.map(k => (
            <li key={k} className="flex items-center gap-2 text-sm leading-[21px] font-medium text-text-inverse/95">
              <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-text-inverse/20">
                <Check className="size-3 text-text-inverse" strokeWidth={3} aria-hidden="true" />
              </span>
              {t(k, lang)}
            </li>
          ))}
        </ul>
      </div>

      <div
        role="img"
        aria-label={t('lp.hero.photos_alt', lang)}
        className="relative ms-[41px] mt-[92px] size-[220px] lg:absolute lg:end-10 lg:top-[129px] lg:ms-0 lg:mt-0 lg:size-[399px] lg:origin-top-right lg:scale-[0.8] xl:end-[122px] xl:scale-90 min-[1440px]:scale-100 rtl:lg:origin-top-left"
      >
        {/* The S-mark and the pyramid are one picture: kept left-to-right in Arabic too (a mirrored S is not our logo). */}
        <div dir="ltr" className="absolute inset-0">
          <SMarkBackdrop className="absolute start-[-16px] top-[-60px] h-[300px] w-[276px] overflow-visible lg:start-[-18px] lg:top-[-102px] lg:h-[560px] lg:w-[515px]" />
          {PHOTOS.map(ph => (
            <Image
              key={ph.src}
              src={ph.src}
              alt=""
              width={200}
              height={200}
              priority
              sizes="(min-width: 1024px) 200px, 110px"
              className={cn('absolute size-[110px] rounded-full lg:size-[200px]', ph.p, ph.d)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// Search bar → /recherche (services side; the results page nudges to products when that side fits better).
// Desktop: 640×64 (r16) · icon · query · divider · city picker · « Rechercher ». Phone: 56 tall (r14), icon button.
function HeroSearch({ lang, cities }: { lang: Lang; cities: string[] }) {
  return (
    <form
      action="/recherche"
      method="get"
      role="search"
      className="mt-6 flex h-14 w-full max-w-[640px] items-center gap-2.5 rounded-[14px] bg-surface-base py-1.5 ps-4 pe-1.5 shadow-[0_12px_32px_-8px_rgb(15_23_41/0.25)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-surface-base lg:h-16 lg:gap-3 lg:rounded-2xl lg:py-2 lg:ps-5 lg:pe-2"
    >
      <input type="hidden" name="type" value="service" />
      <Search className="size-[18px] shrink-0 text-text-muted lg:size-5" aria-hidden="true" />
      <input
        type="search"
        name="q"
        aria-label={t('lp.hero.search.label', lang)}
        placeholder={t('lp.hero.search.placeholder', lang)}
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] leading-[22px] text-ellipsis text-text-primary outline-none placeholder:text-text-muted lg:text-base lg:leading-[26px] [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="hidden h-7 w-px shrink-0 bg-border-subtle lg:block" aria-hidden="true" />
      <label className="relative hidden shrink-0 items-center gap-1.5 lg:flex">
        <MapPin className="size-[18px] text-text-secondary" aria-hidden="true" />
        <span className="sr-only">{t('lp.hero.search.city', lang)}</span>
        <select
          name="ville"
          defaultValue=""
          className="cursor-pointer appearance-none rounded-md bg-transparent pe-[22px] text-base leading-[26px] font-medium text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-300"
        >
          <option value="">{t('lp.hero.search.city_all', lang)}</option>
          {cities.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-0 size-4 text-text-muted" aria-hidden="true" />
      </label>
      <button
        type="submit"
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-brand-blue-600 text-base leading-[26px] font-semibold text-text-inverse transition-colors hover:bg-brand-blue-700 active:bg-brand-blue-800 motion-reduce:transition-none lg:h-12 lg:w-auto lg:rounded-xl lg:px-6',
          FOCUS_RING,
        )}
      >
        <Search className="size-5 lg:hidden" aria-hidden="true" />
        <span className="sr-only lg:not-sr-only">{t('lp.hero.search.submit', lang)}</span>
      </button>
    </form>
  )
}
