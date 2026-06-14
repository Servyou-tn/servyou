import Image from 'next/image'

// The real Servyou logo. Rendered via next/image with `priority` because it sits
// above the fold on every page (the Header is in the root layout). Source is
// 1536×1024 (3:2). The caller controls the height via `className` (default h-16
// ≈ 64px). `block w-auto` keeps the aspect ratio and drops the inline-image
// baseline gap so the logo centers cleanly. Used by both Header and mobile overlay.
export function Wordmark({ className = 'h-16' }: { className?: string }) {
  return (
    <Image
      src="/brand/logo/servyou-navbar.png"
      alt="Servyou"
      width={1536}
      height={1024}
      priority
      className={`block w-auto ${className}`}
    />
  )
}
