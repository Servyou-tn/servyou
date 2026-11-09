import Image from 'next/image'
import { Briefcase, ChevronRight, Code, Megaphone, Palette, ShoppingBag, Smartphone, Store, Video, type LucideIcon } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { ButtonLink, WordmarkText } from './ui'

// Section 7 · Final CTA — Figma 1725:51736 (refs: orbit diagram + scattered faces). White box with a 2px
// blue-600 border; text + 2 doors on one side, the « orbit » on the other: the S mark alone in the centre,
// the 3 hero photos on the outer ring (with role chips on desktop), 6 category icons and the official
// Facebook / Instagram / WhatsApp logos. The orbit is drawn on its desktop 480 grid and scaled to 300 on
// phones (0.625 — the phone frame uses exactly that ratio).
const PHOTOS = [
  { src: '/brand/landing/client.webp', pos: 'start-[-16px] top-[98px]' },
  { src: '/brand/landing/free.webp', pos: 'start-[391px] top-[63px]' },
  { src: '/brand/landing/owner.webp', pos: 'start-[219px] top-[433px]' },
]
const CHIPS: { key: string; icon: LucideIcon; pos: string }[] = [
  { key: 'client', icon: ShoppingBag, pos: 'start-[-18px] top-[188px]' },
  { key: 'free', icon: Briefcase, pos: 'start-[383px] top-[155px]' },
  { key: 'shop', icon: Store, pos: 'start-[311px] top-[462px]' },
]
const CATS: { icon: LucideIcon; pos: string }[] = [
  { icon: Code, pos: 'start-[175px] top-[59px]' },
  { icon: Palette, pos: 'start-[371px] top-[273px]' },
  { icon: ShoppingBag, pos: 'start-[101px] top-[333px]' },
  { icon: Smartphone, pos: 'start-[59px] top-[259px]' },
  { icon: Video, pos: 'start-[311px] top-[83px]' },
  { icon: Megaphone, pos: 'start-[259px] top-[375px]' },
]
const SOCIAL = [
  { src: '/brand/landing/facebook.webp', pos: 'start-[237px] top-[-19px]' },
  { src: '/brand/landing/instagram.webp', pos: 'start-[430px] top-[316px]' },
  { src: '/brand/landing/whatsapp.webp', pos: 'start-[12px] top-[334px]' },
]

function Orbit({ lang }: { lang: Lang }) {
  return (
    <div className="size-[300px] shrink-0 lg:size-[384px] xl:size-[480px]" aria-hidden="true">
      <div className="relative size-[480px] origin-top-left scale-[0.625] lg:scale-[0.8] xl:scale-100 rtl:origin-top-right">
        {[
          ['start-1 top-1 size-[472px] bg-brand-blue-50/45'],
          ['start-[76px] top-[76px] size-[328px] bg-brand-blue-50/70'],
          ['start-[148px] top-[148px] size-[184px] bg-brand-blue-50'],
        ].map(([c]) => (
          <span key={c} className={cn('absolute rounded-full border border-brand-blue-100', c)} />
        ))}
        <Image src="/brand/landing/smark.webp" alt="" width={100} height={100} className="absolute start-[190px] top-[190px] size-[100px]" />
        {CATS.map(({ icon: Icon, pos }, i) => (
          <span
            key={i}
            className={cn(
              'absolute flex size-[46px] items-center justify-center rounded-full border border-brand-blue-100 bg-surface-base text-brand-blue-600 shadow-[0_6px_14px_-4px_rgb(15_23_41/0.12)]',
              pos,
            )}
          >
            <Icon className="size-5" />
          </span>
        ))}
        {SOCIAL.map(s => (
          <Image key={s.src} src={s.src} alt="" width={48} height={48} className={cn('absolute size-12 drop-shadow-[0_8px_8px_rgb(15_23_41/0.18)]', s.pos)} />
        ))}
        {PHOTOS.map(p => (
          <Image
            key={p.src}
            src={p.src}
            alt=""
            width={84}
            height={84}
            className={cn('absolute size-[84px] rounded-full ring-4 ring-surface-base shadow-[0_12px_24px_-4px_rgb(15_23_41/0.22)]', p.pos)}
          />
        ))}
        {CHIPS.map(({ key, icon: Icon, pos }) => (
          <span
            key={key}
            className={cn(
              'absolute hidden h-[29px] items-center gap-1.5 rounded-full border border-brand-blue-100 bg-surface-base ps-2.5 pe-3 text-xs leading-[17px] font-semibold text-brand-blue-700 shadow-[0_8px_16px_-4px_rgb(10_26_77/0.25)] lg:inline-flex',
              pos,
            )}
          >
            <Icon className="size-3.5" />
            {t(`lp.final.chip.${key}`, lang)}
          </span>
        ))}
      </div>
    </div>
  )
}

export function FinalCta({ lang }: { lang: Lang }) {
  return (
    <section className="mx-2 mt-4 flex flex-col items-center gap-8 rounded-3xl border-2 border-brand-blue-600 bg-surface-base px-5 py-12 lg:mx-6 lg:mt-8 lg:flex-row-reverse lg:justify-between lg:gap-12 lg:rounded-[32px] lg:px-24 lg:py-16 max-xl:lg:px-12">
      <Orbit lang={lang} />
      <div className="flex w-full flex-col items-center gap-4 text-center lg:max-w-[565px] lg:min-w-0 lg:flex-1 lg:items-start lg:gap-5 lg:text-start">
        <span className="inline-flex h-[31px] items-center gap-2 rounded-full border border-brand-blue-100 bg-brand-blue-50 px-3.5 text-xs leading-[17px] font-semibold text-brand-blue-700">
          <span className="size-2 rounded-full bg-success-500" aria-hidden="true" />
          {t('lp.beta', lang)}
        </span>
        <h2 className="flex flex-wrap items-center justify-center gap-x-[7px] text-2xl leading-[30px] font-bold tracking-[-0.01em] text-text-primary lg:flex-col lg:items-start lg:gap-0.5 lg:text-[44px] lg:leading-[46px] lg:font-black lg:tracking-[-0.02em] rtl:tracking-normal">
          <span>{t('lp.final.title', lang)}</span>
          <span className="inline-flex items-center gap-[3px] lg:gap-[5px]">
            <WordmarkText className="text-[24px] lg:text-[44px]" />
            <span className="text-brand-blue-600">{t('lp.final.q', lang)}</span>
          </span>
        </h2>
        <p className="text-base leading-[26px] text-text-secondary lg:max-w-[500px] lg:text-lg lg:leading-7">{t('lp.final.subtitle', lang)}</p>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
          <ButtonLink href="/inscription" className="h-14 rounded-[14px] px-6">
            {t('lp.cta.start', lang)}
            <ChevronRight className="size-[18px] rtl:rotate-180" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink
            href="/inscription"
            variant="ghost"
            className="h-[59px] rounded-[14px] border-[1.5px] border-brand-blue-200 bg-surface-base px-6 text-brand-blue-700 lg:h-14"
          >
            {t('lp.final.second', lang)}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
