import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// Shared building blocks for the v3 landing (Figma « LANDING PAGE v3 », section 1662:29222).
// Every size below is measured from the frame (desktop 1662:29225 · phone 1662:29267); the phone
// layout is the default and `lg:` switches to the desktop one. Arabic mirrors through logical
// properties (ms/me/ps/pe/start/end) — nothing here is direction-specific.

/** Overline · 12/17 Semi Bold, +8% tracking, upper-case (Arabic: no tracking, no case). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-xs leading-[17px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal', className)}>
      {children}
    </p>
  )
}

/** Section title · phone H2 24/30 (-1%) → desktop H1 32/38 (-2%). */
export const TITLE = 'text-2xl leading-[30px] font-bold tracking-[-0.01em] lg:text-[32px] lg:leading-[38px] lg:tracking-[-0.02em] rtl:tracking-normal'
/** Section lead · phone Body 16/26 → desktop Body Large 18/28. */
export const LEAD = 'text-base leading-[26px] lg:text-lg lg:leading-7'

/** The Figma « Wordmark » (220:7398): « Serv » brand-blue-800 + « You » brand-blue-600, Inter Bold.
 *  Always Latin and always LTR — it is the brand, not a translatable string. */
export function WordmarkText({ className }: { className?: string }) {
  return (
    <span dir="ltr" className={cn('font-[family-name:var(--font-inter)] font-bold leading-none whitespace-nowrap', className)}>
      <span className="text-brand-blue-800">Serv</span>
      <span className="text-brand-blue-600">You</span>
    </span>
  )
}

/** The Figma « Lockup » (223:7431): S-mark + wordmark. `size` is the S-mark edge in px; the wordmark
 *  is 0.714 × size (22.86px at 32) and the gap 0.25 × size — the component's own proportions. */
export function Lockup({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span dir="ltr" className={cn('inline-flex items-center', className)} style={{ gap: size / 4 }}>
      <Image src="/brand/landing/smark.webp" alt="" width={size} height={size} aria-hidden="true" />
      <span style={{ fontSize: size * 0.714 }}>
        <WordmarkText />
      </span>
    </span>
  )
}

/** Blue 40px icon tile used by the Freelances / Boutiques benefits. */
export function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-blue-50 text-brand-blue-600', className)}>
      {children}
    </span>
  )
}

/** A Figma Button (19:207) rendered as a real link. */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'lg',
  className,
}: {
  href: string
  children: ReactNode
  variant?: 'primary' | 'white' | 'outline-white' | 'ghost' | 'link'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const v = {
    primary: 'bg-brand-blue-600 text-text-inverse hover:bg-brand-blue-700 active:bg-brand-blue-800',
    white: 'bg-surface-base text-brand-blue-700 hover:bg-brand-blue-50',
    'outline-white': 'border-[1.5px] border-surface-base text-text-inverse hover:bg-white/10',
    ghost: 'text-brand-blue-600 hover:bg-brand-blue-50',
    link: 'text-brand-blue-600 hover:underline',
  }[variant]
  const s = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-base', lg: 'h-12 px-5 text-base' }[size]
  return (
    <Link
      href={href}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold whitespace-nowrap transition-colors motion-reduce:transition-none',
        FOCUS_RING,
        s,
        v,
        className,
      )}
    >
      {children}
    </Link>
  )
}
