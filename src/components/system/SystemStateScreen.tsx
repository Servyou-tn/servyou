import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BASE, SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

// K1–K4 — Figma 731:64370 … 731:64476: a shell-less centred card (no sidebar, no topbar: the visitor
// is signed out or has no access). Viewport = surface/subtle, card 480 (FILL on mobile) with pad 32 /
// gap 24 / radius 12, Lockup → 112 icon circle (64 glyph) → H1 22 → body 15 → CTA lg FILL → optional
// link. K3 draws the card in a 2px danger outline. The optional link slot takes a node so K3 can put its
// sign-out POST form there. A9 / A10 (404 / 500, Figma 1478:35813 / 1478:35837) reuse it as-is, adding an
// optional `eyebrow` line (« Erreur 404 », « Erreur 500 · réf. … ») above the title, and a CTA that is a
// BUTTON (`onClick`, « Réessayer ») instead of a link. No hooks: a server page renders it with an `href`
// CTA; the client error boundary passes `onClick`.
export type SystemTone = 'info' | 'warning' | 'danger' | 'accent'

const TONE: Record<SystemTone, { circle: string; icon: string }> = {
  info: { circle: 'bg-brand-blue-100', icon: 'text-brand-blue-600' },
  warning: { circle: 'bg-warning-100', icon: 'text-warning-500' },
  danger: { circle: 'bg-danger-100', icon: 'text-danger-500' },
  accent: { circle: 'bg-brand-indigo-100', icon: 'text-brand-indigo-500' },
}

export const SYSTEM_LINK_CLASS = cn(BASE, SIZE.md, VARIANT_BASE.link, VARIANT_STATE.link)

export function SystemStateScreen({
  tone,
  icon,
  eyebrow,
  title,
  body,
  cta,
  secondaryCta = false,
  link,
  outlined = false,
}: {
  tone: SystemTone
  icon: ReactNode
  /** A9 / A10: a muted line above the title (« Erreur 404 »). */
  eyebrow?: string
  title: string
  body: string
  /** A link (`href`) or, for « Réessayer », a button (`onClick`). */
  cta: { href: string; label: string } | { onClick: () => void; label: string }
  /** K4: the CTA is a secondary button, not the primary one. */
  secondaryCta?: boolean
  link?: ReactNode
  /** K3: 2px danger outline instead of the 1px subtle border. */
  outlined?: boolean
}) {
  const variant = secondaryCta ? 'secondary' : 'primary'
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10"
    >
      <div
        className={cn(
          'flex w-full max-w-120 flex-col items-center gap-6 rounded-xl bg-surface-base p-8',
          outlined ? 'border-2 border-danger-500' : 'border border-border-subtle',
        )}
      >
        <div className="flex items-center gap-2">
          <Image src="/brand/logo/servyou-s-mark.png" alt="" width={32} height={32} priority />
          <span className="text-xl font-bold">
            <span className="text-brand-blue-800">Serv</span>
            <span className="text-brand-blue-600">You</span>
          </span>
        </div>

        <div className={cn('flex size-28 items-center justify-center rounded-full', TONE[tone].circle, TONE[tone].icon)} aria-hidden="true">
          {icon}
        </div>

        {eyebrow ? <p className="text-center text-[15px] leading-[22px] text-text-muted">{eyebrow}</p> : null}
        {/* 22 Semi Bold on a 27 line (Figma 1478:35813: h27, two lines = 54) — without it the title inherits the body's 1.5 and every card grows. */}
        <h1 className="text-center text-[22px] leading-[27px] font-semibold text-text-primary">{title}</h1>
        <p className="text-center text-[15px] leading-[22px] text-text-muted">{body}</p>

        {'href' in cta ? (
          <Link href={cta.href} className={cn(BASE, SIZE.lg, VARIANT_BASE[variant], VARIANT_STATE[variant], 'w-full')}>
            {cta.label}
          </Link>
        ) : (
          <button type="button" onClick={cta.onClick} className={cn(BASE, SIZE.lg, VARIANT_BASE[variant], VARIANT_STATE[variant], 'w-full cursor-pointer')}>
            {cta.label}
          </button>
        )}

        {link}
      </div>
    </main>
  )
}

export function HomeLink({ lang }: { lang: Lang }) {
  return (
    <Link href="/" className={SYSTEM_LINK_CLASS}>
      {t('common.back_home', lang)}
    </Link>
  )
}
