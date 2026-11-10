import Image from 'next/image'
import { Briefcase, Inbox, LayoutDashboard, Link2, Store, Truck, type LucideIcon } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { ButtonLink, Eyebrow, IconTile, LEAD, TITLE } from './ui'

// Sections 2 · Freelances (#freelances, 1697:50162) and 3 · Boutiques (#boutiques, 1705:53282).
// Desktop: full-bleed band (770 tall, 96px top/bottom), a 440 text column 120px from the edge and the
// real-data dashboard screenshot bleeding off the other edge (Freelances: text first; Boutiques: mirrored).
// Phone: text, then the iPhone mock-up (343×600). The screenshots are the founder's test accounts
// (« Youssef B. », « Sami Store »), captured from the real app — no invented numbers.
type Role = 'free' | 'shop'

const CONFIG: Record<Role, {
  id: string
  band: string
  benefits: LucideIcon[]
  cta: string
  shot: { src: string; w: number; h: number; box: string; left: number; card: number; cardH: number }
}> = {
  free: {
    id: 'freelances',
    band: 'bg-surface-subtle',
    benefits: [Link2, Briefcase, LayoutDashboard],
    cta: '/devenir-freelance',
    shot: { src: '/brand/landing/dash-free.webp', w: 856, h: 613, box: 'max-w-[824px] aspect-[824/549]', left: -32, card: 824, cardH: 549 },
  },
  shop: {
    id: 'boutiques',
    band: 'bg-surface-base',
    benefits: [Store, Inbox, Truck],
    cta: '/devenir-vendeur',
    shot: { src: '/brand/landing/dash-shop.webp', w: 848, h: 599, box: 'max-w-[816px] aspect-[816/535]', left: 0, card: 816, cardH: 535 },
  },
}

export function RoleShowcase({ role, lang }: { role: Role; lang: Lang }) {
  const c = CONFIG[role]
  const k = (s: string) => `lp.${role}.${s}`
  const textFirst = role === 'free'

  const text = (
    <div className="flex w-full flex-col gap-6 lg:w-[440px] lg:shrink-0 lg:gap-8">
      <div className="flex flex-col gap-2 lg:gap-3">
        <Eyebrow className="text-brand-blue-600">{t(k('eyebrow'), lang)}</Eyebrow>
        <h2 className={cn(TITLE, 'text-text-primary')}>{t(k('title'), lang)}</h2>
        <p className={cn(LEAD, 'text-text-secondary')}>{t(k('subtitle'), lang)}</p>
      </div>
      <ul className="flex flex-col gap-5 lg:gap-6">
        {c.benefits.map((Icon, i) => (
          <li key={i} className="flex gap-4">
            <IconTile>
              <Icon className="size-5" aria-hidden="true" />
            </IconTile>
            <div className="flex flex-col gap-1">
              <h3 className="text-base leading-[26px] font-semibold text-text-primary">{t(k(`b${i + 1}.title`), lang)}</h3>
              <p className="text-sm leading-[21px] text-text-secondary">{t(k(`b${i + 1}.body`), lang)}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-center gap-3 lg:items-start">
        <ButtonLink href={c.cta} className="w-full lg:w-auto">
          {t(k('cta'), lang)}
        </ButtonLink>
        <p className="text-xs leading-[17px] font-medium text-text-muted">{t('lp.beta', lang)}</p>
      </div>
    </div>
  )

  // The card takes the room left next to the text (never more than its Figma size) and scales as one
  // piece — same aspect ratio, nothing stretched — so a 1366px screen shows what Figma shows at 1440.
  // The export carries the card's drop shadow (32px each side, 16 above): offsets are percentages of the
  // card so the shadow scales with it.
  const s = c.shot
  const desktopShot = (
    <div className={cn('relative hidden min-w-0 flex-1 lg:block', s.box)}>
      <Image
        src={s.src}
        alt={t(k('shot_alt'), lang)}
        width={s.w}
        height={s.h}
        sizes="(min-width: 1440px) 856px, 60vw"
        style={{ left: `${(s.left / s.card) * 100}%`, top: `${(-16 / s.cardH) * 100}%`, width: `${(s.w / s.card) * 100}%` }}
        className="absolute h-auto max-w-none"
      />
    </div>
  )

  return (
    <section id={c.id} className={cn('scroll-mt-20 overflow-hidden', c.band, role === 'free' ? 'mt-[30px] lg:mt-[68px]' : '')}>
      <div
        className={cn(
          'flex flex-col items-center gap-8 px-4 py-14 lg:min-h-[770px] lg:flex-row lg:gap-14 lg:py-24',
          textFirst ? 'lg:ps-12 lg:pe-0 xl:ps-[120px]' : 'lg:ps-0 lg:pe-12 lg:gap-16 xl:pe-[120px]',
        )}
      >
        {textFirst ? text : desktopShot}
        {textFirst ? desktopShot : text}
        <div className="w-full lg:hidden">
          <Image
            src={`/brand/landing/phone-${role}-${lang}.webp`}
            alt={t(k('shot_alt'), lang)}
            width={354}
            height={668}
            sizes="354px"
            className="mx-auto h-auto w-[354px] max-w-full"
          />
        </div>
      </div>
    </section>
  )
}
