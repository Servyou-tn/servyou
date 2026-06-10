import Image from 'next/image'

// The real Servyou logo. Rendered via next/image with `priority` because it sits
// above the fold on every page (the Header is in the root layout). Source is
// 1536×1024 (3:2); `h-16 w-auto` displays it 64px tall (~96px wide). `block`
// removes the inline-image baseline gap so the logo centers cleanly on the same
// line as the nav pill. Used by both the desktop Header and the mobile overlay.
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/brand/logo/servyou-navbar.png"
      alt="Servyou"
      width={1536}
      height={1024}
      priority
      className={`block h-16 w-auto ${className}`}
    />
  )
}
