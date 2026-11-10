import Image from 'next/image'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { ButtonLink } from './ui'

// Hero — Figma « Hero box · blue/500 » + H1 + subheadline + 2 CTAs + the 3-photo pyramid.
// Desktop: 1392×520 box (r32), text column 80px in / 95px down, pyramid 399² at 871/70.
// Phone:   359-wide box (r24), 20px in / 36px down, pyramid 220² under the CTAs.
const PHOTOS = [
  // [src, desktop x/y in the 399 group, phone x/y in the 220 group]
  { src: '/brand/landing/owner.webp', d: 'lg:start-[146px] lg:top-0', p: 'start-[81px] top-0' },
  { src: '/brand/landing/free.webp', d: 'lg:start-0 lg:top-[146px]', p: 'start-0 top-[81px]' },
  { src: '/brand/landing/client.webp', d: 'lg:start-[199px] lg:top-[199px]', p: 'start-[110px] top-[110px]' },
] as const

export function Hero({ lang }: { lang: Lang }) {
  return (
    <section className="mx-2 mt-0.5 overflow-hidden rounded-3xl bg-brand-blue-500 px-5 pt-9 pb-8 lg:relative lg:mx-6 lg:mt-4 lg:h-[520px] lg:rounded-[32px] lg:px-20 lg:pt-[95px] lg:pb-0">
      <div className="lg:max-w-[520px] xl:max-w-[660px]">
        <h1 className="text-[32px] leading-[38px] font-bold tracking-[-0.02em] text-text-inverse lg:text-[44px] lg:leading-[46px] lg:font-black rtl:tracking-normal">
          {t('lp.hero.title', lang)}
        </h1>
        <p className="mt-[18px] max-w-[580px] text-lg leading-7 text-text-inverse lg:mt-6">{t('lp.hero.subtitle', lang)}</p>
        <div className="mt-7 flex flex-col gap-3 lg:mt-9 lg:flex-row lg:gap-4">
          <ButtonLink href="/inscription" variant="white" className="h-[52px] text-text-primary lg:h-12">
            {t('lp.cta.start', lang)}
          </ButtonLink>
          <ButtonLink href="#comment-ca-marche" variant="outline-white" className="h-[52px] lg:h-12">
            {t('lp.cta.how', lang)}
          </ButtonLink>
        </div>
      </div>

      <div
        role="img"
        aria-label={t('lp.hero.photos_alt', lang)}
        className="relative ms-[41px] mt-10 size-[220px] lg:absolute lg:end-10 lg:top-[70px] lg:ms-0 lg:mt-0 lg:size-[399px] lg:origin-top-right lg:scale-[0.8] xl:end-[122px] xl:scale-100 rtl:lg:origin-top-left"
      >
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
    </section>
  )
}
