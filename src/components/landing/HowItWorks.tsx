'use client'

import Image from 'next/image'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check, FileCheck, Inbox, Package, Search, Send, ShoppingBag, Smartphone } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { ButtonLink, Eyebrow, LEAD, TITLE } from './ui'

// Section 5 · Comment ça marche (#comment-ca-marche) — Figma 1715:50246 (Client state on the landing),
// Freelance 1718:51042 and Boutique 1718:51284. One strong blue-600 box, a Client | Freelance | Boutique
// switch with the 3 hero photos, 3 numbered white step cards each with a mini UI preview, one CTA.
type Role = 'client' | 'free' | 'shop'
const ROLES: { id: Role; tab: string; photo: string; cta: string; ctaKey: string }[] = [
  { id: 'client', tab: 'lp.how.tab.client', photo: '/brand/landing/client.webp', cta: '/inscription', ctaKey: 'lp.cta.start' },
  { id: 'free', tab: 'lp.how.tab.freelance', photo: '/brand/landing/free.webp', cta: '/devenir-freelance', ctaKey: 'lp.free.cta' },
  { id: 'shop', tab: 'lp.how.tab.shop', photo: '/brand/landing/owner.webp', cta: '/devenir-vendeur', ctaKey: 'lp.shop.cta' },
]

// ── mini UI atoms (all measured: 12/17 Semi Bold pills, 14/21 titles, 28px icon tiles, r14 cards) ──
const Pill = ({ children, tone = 'blue', className }: { children: ReactNode; tone?: 'blue' | 'white' | 'green'; className?: string }) => (
  <span
    className={cn(
      'inline-flex h-[27px] items-center gap-[5px] rounded-full px-2.5 text-xs leading-[17px] font-semibold whitespace-nowrap [&_svg]:size-[13px]',
      tone === 'blue' && 'bg-brand-blue-100 text-brand-blue-700',
      tone === 'white' && 'bg-surface-base text-text-secondary',
      tone === 'green' && 'bg-success-50 text-success-700',
      className,
    )}
  >
    {children}
  </span>
)
const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('flex w-full flex-col gap-2.5 rounded-[14px] border border-border-subtle bg-surface-base p-3', className)}>{children}</div>
)
const Tile = ({ children }: { children: ReactNode }) => (
  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50 text-brand-blue-600 [&_svg]:size-4">{children}</span>
)
const TwoLine = ({ title, meta }: { title: string; meta: string }) => (
  <span className="flex min-w-0 flex-col">
    <span className="text-sm leading-[21px] font-semibold text-text-primary">{title}</span>
    <span className="text-xs leading-[17px] text-text-muted">{meta}</span>
  </span>
)
const Ok = () => (
  <span className="ms-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-500 [&_svg]:size-3">
    <Check strokeWidth={3} aria-hidden="true" />
  </span>
)
const Avatar = ({ src, size }: { src: string; size: number }) => (
  <Image src={src} alt="" width={size} height={size} className="shrink-0 rounded-full" style={{ width: size, height: size }} />
)

function Visual({ role, step, l }: { role: Role; step: number; l: (k: string) => string }) {
  if (role === 'client' && step === 1)
    return (
      <>
        <div className="flex h-[43px] items-center gap-2 rounded-xl border border-border-subtle bg-surface-base px-3">
          <Search className="size-4 text-text-muted" aria-hidden="true" />
          <span className="text-sm leading-[21px] text-text-muted">{l('v.search')}</span>
        </div>
        <div className="flex gap-1.5">
          <Pill>{l('v.sousse')}</Pill>
          <Pill tone="white">{l('v.freelancers')}</Pill>
          <Pill tone="white">{l('v.products')}</Pill>
        </div>
      </>
    )
  if (role === 'client' && step === 2)
    return (
      <>
        <Card>
          <span className="flex items-center gap-2.5">
            <Tile><Send aria-hidden="true" /></Tile>
            <TwoLine title={l('v.offer')} meta={l('v.offer_meta')} />
          </span>
          <Pill className="self-start"><Inbox aria-hidden="true" />{l('v.proposals')}</Pill>
        </Card>
        <span className="flex items-center gap-2">
          <span className="text-xs leading-[17px] text-text-muted">{l('v.or')}</span>
          <Pill tone="white" className="text-brand-blue-700"><ShoppingBag aria-hidden="true" />{l('v.order')}</Pill>
        </span>
      </>
    )
  if (role === 'client' && step === 3)
    return (
      <>
        <Card><span className="flex items-center gap-2.5"><Tile><Package aria-hidden="true" /></Tile><TwoLine title={l('v.parcel')} meta={l('v.parcel_meta')} /><Ok /></span></Card>
        <Card><span className="flex items-center gap-2.5"><Tile><FileCheck aria-hidden="true" /></Tile><TwoLine title={l('v.mission')} meta={l('v.mission_meta')} /><Ok /></span></Card>
      </>
    )
  if (role === 'free' && step === 1)
    return (
      <Card>
        <span className="flex items-center gap-2.5">
          <Avatar src="/brand/landing/free.webp" size={36} />
          <TwoLine title={l('v.profile_name')} meta={l('v.profile_meta')} />
        </span>
        <span className="flex items-center justify-between text-xs leading-[17px]">
          <span className="text-text-muted">{l('v.profile_strength')}</span>
          <span className="font-semibold text-text-primary">75&nbsp;%</span>
        </span>
        <span className="h-1.5 rounded-full bg-brand-blue-100"><span className="block h-full w-3/4 rounded-full bg-brand-blue-600" /></span>
      </Card>
    )
  if (role === 'free' && step === 2)
    return (
      <Card>
        <span className="flex items-center justify-between gap-2">
          <TwoLine title={l('v.ugc')} meta={l('v.offer_city')} />
          <span dir="ltr" className="text-sm leading-[21px] font-bold whitespace-nowrap text-brand-blue-700">{l('v.budget')}</span>
        </span>
        <span className="flex h-[33px] items-center justify-center gap-1.5 rounded-[10px] bg-brand-blue-600 text-xs leading-[17px] font-semibold text-text-inverse">
          <Send className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
          {l('v.apply')}
        </span>
      </Card>
    )
  if (role === 'free' && step === 3)
    return (
      <>
        <span className="flex gap-1.5">
          <Pill tone="green"><Check aria-hidden="true" />{l('v.delivered')}</Pill>
          <Pill>{l('v.validated')}</Pill>
        </span>
        <Card className="py-3">
          <span className="flex items-center gap-2.5">
            <Avatar src="/brand/landing/client.webp" size={30} />
            <span className="text-xs leading-[17px] font-semibold text-text-primary">{l('v.paid_direct')}</span>
          </span>
        </Card>
      </>
    )
  if (role === 'shop' && step === 1)
    return (
      <Card>
        <span className="flex items-center gap-2.5">
          <Tile><Smartphone aria-hidden="true" /></Tile>
          <TwoLine title="iPhone 14 Pro Max" meta={l('v.product_meta')} />
        </span>
        <span className="flex items-center justify-between">
          <span className="text-xs leading-[17px] text-text-muted">{l('v.stock')}</span>
          <Pill>{l('v.in_stock')}</Pill>
        </span>
      </Card>
    )
  if (role === 'shop' && step === 2)
    return (
      <>
        <Pill className="self-start"><ShoppingBag aria-hidden="true" />{l('v.new_order')}</Pill>
        <Card>
          <span className="flex items-center gap-2.5">
            <Tile><Package aria-hidden="true" /></Tile>
            <TwoLine title="Jordan × 2" meta={l('v.order_meta')} />
          </span>
          <span className="flex h-[33px] items-center justify-center rounded-[10px] bg-success-700 text-xs leading-[17px] font-semibold text-text-inverse">
            {l('v.confirm_wa')}
          </span>
        </Card>
      </>
    )
  return (
    <>
      <span className="flex items-center gap-1">
        {(['prep', 'ship', 'delivery'] as const).map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            {i > 0 && <span className="h-0.5 w-2 bg-brand-blue-300" aria-hidden="true" />}
            <span className={cn('size-2.5 rounded-full', i === 2 ? 'bg-success-500' : 'bg-brand-blue-600')} aria-hidden="true" />
            <span className="text-xs leading-[17px] font-semibold text-text-primary">{l(`v.${s}`)}</span>
          </span>
        ))}
      </span>
      <Pill tone="green" className="self-start"><Check aria-hidden="true" />{l('v.cash')}</Pill>
    </>
  )
}

export function HowItWorks() {
  const lang = useLang()
  const [role, setRole] = useState<Role>('client')
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const l = (k: string) => t(`lp.how.${k}`, lang)
  const current = ROLES.find(r => r.id === role) ?? ROLES[0]

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const rtl = document.documentElement.dir === 'rtl'
    const next = (i + (rtl ? -dir : dir) + ROLES.length) % ROLES.length
    setRole(ROLES[next].id)
    tabs.current[next]?.focus()
  }

  return (
    <section
      id="comment-ca-marche"
      className="mx-2 mt-4 flex scroll-mt-20 flex-col items-center gap-8 rounded-3xl bg-brand-blue-600 px-2 py-14 lg:mx-6 lg:mt-8 lg:gap-12 lg:rounded-[32px] lg:px-6 lg:py-24"
    >
      <div className="flex max-w-[640px] flex-col items-center gap-4 text-center">
        <Eyebrow className="text-brand-blue-100">{l('eyebrow')}</Eyebrow>
        <h2 className={cn(TITLE, 'text-text-inverse')}>{l('title')}</h2>
        <p className={cn(LEAD, 'text-brand-blue-50')}>{l('subtitle')}</p>
      </div>

      <div
        role="tablist"
        aria-label={l('tabs_label')}
        className="flex w-full max-w-[343px] gap-0.5 rounded-full bg-brand-blue-700 p-1 lg:w-auto lg:max-w-none lg:gap-1 lg:p-1.5"
      >
        {ROLES.map((r, i) => {
          const active = r.id === role
          return (
            <button
              key={r.id}
              ref={el => { tabs.current[i] = el }}
              type="button"
              role="tab"
              id={`how-tab-${r.id}`}
              aria-selected={active}
              aria-controls="how-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => setRole(r.id)}
              onKeyDown={e => onKey(e, i)}
              className={cn(
                'flex h-9 flex-1 items-center justify-center gap-[5px] rounded-full ps-1 pe-2 transition-colors lg:h-[46px] lg:flex-none lg:justify-start lg:gap-2 lg:ps-1.5 lg:pe-5',
                active ? 'bg-surface-base text-brand-blue-700' : 'text-brand-blue-50 hover:bg-white/10',
                FOCUS_RING,
              )}
            >
              <Image
                src={r.photo}
                alt=""
                width={34}
                height={34}
                className={cn('size-[26px] rounded-full ring-2 lg:size-[34px]', active ? 'ring-brand-blue-600' : 'ring-surface-base')}
              />
              <span className="text-sm leading-[21px] font-semibold lg:text-base lg:leading-[26px]">{t(r.tab, lang)}</span>
            </button>
          )
        })}
      </div>

      <ol
        id="how-panel"
        role="tabpanel"
        aria-labelledby={`how-tab-${role}`}
        className="flex w-full flex-col gap-4 lg:grid lg:max-w-[1200px] lg:grid-cols-[minmax(0,360px)_minmax(24px,60px)_minmax(0,360px)_minmax(24px,60px)_minmax(0,360px)] lg:items-center lg:justify-center lg:gap-0"
      >
        {[1, 2, 3].map(step => (
          <li key={step} className="flex flex-col lg:contents">
            {step > 1 && <span className="hidden h-0 w-full border-t-2 border-dashed border-white/60 lg:block" aria-hidden="true" />}
            <div
              className={cn(
                'flex w-full flex-col gap-5 rounded-3xl bg-surface-base p-7 shadow-[0_24px_48px_-16px_rgb(10_26_61/0.28)] max-xl:lg:p-5',
                role === 'client' ? 'lg:h-[440px]' : 'lg:h-[414px]',
              )}
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-brand-blue-600 text-xl leading-[26px] font-bold text-text-inverse ring-[6px] ring-brand-blue-100">
                {step}
              </span>
              <div className="flex h-[150px] flex-col justify-center gap-2.5 rounded-2xl border border-brand-blue-100 bg-brand-blue-50 p-5">
                <Visual role={role} step={step} l={l} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl leading-[26px] font-semibold tracking-[-0.01em] text-text-primary rtl:tracking-normal">{l(`${role}.s${step}.title`)}</h3>
                <p className="text-base leading-[26px] text-text-secondary">{l(`${role}.s${step}.body`)}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col items-center gap-3">
        <ButtonLink href={current.cta} variant="white" className="text-brand-blue-600">
          {t(current.ctaKey, lang)}
        </ButtonLink>
        <p className="text-sm leading-[21px] text-brand-blue-100">{l('free_all')}</p>
      </div>
    </section>
  )
}
