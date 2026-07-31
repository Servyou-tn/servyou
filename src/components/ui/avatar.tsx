import Image from 'next/image'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

// Avatar — the F2 proving primitive. Measured from Figma (COMPONENT_SET 47:1528), token-bound, and
// compliant with the four shared/ui boundary rules (tokens only, role-agnostic, feature-independent,
// no CSS property both set and accepted from the caller).
//
// Three types (measured, not from the doc):
//   image     — the picture, clipped to a circle
//   fallback  — the DEFAULT when there is no image: border-strong circle + person glyph in text-muted
//   initials  — explicit opt-in: brand-blue-100 circle + brand-blue-600 letters
// Six sizes match Figma exactly. Online-dot and verified-badge are intentionally omitted (phase-aware).

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

// box sizes = Figma px via Tailwind's spacing scale: 24 · 32 · 40 · 56 · 80 · 120.
//
// `px` is the rendered CSS width, passed to next/image's `sizes`. It was previously hardcoded to
// "120px" for ALL six sizes — which never actually executed, because nothing in the app passed
// `src` until the avatar upload shipped. So this is specifying behaviour that is live for the
// first time, not changing behaviour that shipped.
//
// Per-size matters here specifically because of the market: mobile-first, low-bandwidth Tunisia.
// A 40px topbar avatar under the old value fetched a 256px-wide source — ~6x the pixels needed, on
// every authenticated page. The cost is more distinct Vercel cache keys per image (each `w` is its
// own key), which is affordable now that next.config.ts pins a one-year TTL: a given avatar renders
// at ~2 sizes in practice (md in the topbar, 2xl on the account page), so ~2 transformations ever.
const SIZE: Record<AvatarSize, { box: string; text: string; icon: string; px: string }> = {
  xs: { box: 'size-6', text: 'text-xs', icon: 'size-3', px: '24px' },
  sm: { box: 'size-8', text: 'text-sm', icon: 'size-4', px: '32px' },
  md: { box: 'size-10', text: 'text-sm', icon: 'size-5', px: '40px' },
  lg: { box: 'size-14', text: 'text-lg', icon: 'size-7', px: '56px' },
  xl: { box: 'size-20', text: 'text-2xl', icon: 'size-10', px: '80px' },
  '2xl': { box: 'size-30', text: 'text-4xl', icon: 'size-14', px: '120px' },
}

type AvatarProps = {
  size?: AvatarSize
  /** Image URL. When present, the picture wins over initials/fallback. */
  src?: string | null
  /** Identity — the image alt, and the accessible label when `decorative` is false. */
  name?: string
  /** Explicit initials variant. Ignored when `src` is set. Omit to get the person-glyph fallback. */
  initials?: string
  /**
   * Decorative by default — most avatars sit beside a visible name or inside a labelled control, so
   * the primitive is hidden from assistive tech and its image gets an empty alt (no double-announce).
   * Pass `decorative={false}` only for a STANDALONE avatar that is the sole identity cue; it is then
   * exposed as role="img" with `name` as the accessible label.
   */
  decorative?: boolean
  className?: string
}

export function Avatar({ size = 'md', src, name, initials, decorative = true, className }: AvatarProps) {
  const s = SIZE[size]
  const a11y: React.HTMLAttributes<HTMLSpanElement> = decorative
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': name || undefined }
  return (
    <span
      {...a11y}
      className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full', s.box, className)}
    >
      {src ? (
        <Image src={src} alt={decorative ? '' : (name ?? '')} fill sizes={s.px} className="object-cover" />
      ) : initials ? (
        <span className={cn('flex size-full items-center justify-center bg-brand-blue-100 font-semibold text-brand-blue-600', s.text)} aria-hidden="true">
          {initials}
        </span>
      ) : (
        <span className="flex size-full items-center justify-center bg-border-strong text-text-muted" aria-hidden="true">
          <User className={s.icon} />
        </span>
      )}
    </span>
  )
}
