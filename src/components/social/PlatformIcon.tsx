import { Globe } from 'lucide-react'
import { PLATFORM_ICON_PATHS } from './platform-icon-paths'
import type { PlatformId } from '@/lib/social/platforms'

// One monochrome glyph per platform: the colour is the caller's (`currentColor`), the size the caller's class (default 20, the Figma icon size).
// Decorative — the accessible name always sits on the link / input around it. `null` (no platform yet) and `website` both draw the globe.
// Sources and licences: ./platform-icon-paths.ts (11 × simple-icons CC0) and lucide `Globe` (ISC).
export function PlatformIcon({ platform, className = 'size-5' }: { platform: PlatformId | null; className?: string }) {
  if (platform === null || platform === 'website') return <Globe className={className} aria-hidden="true" />
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" focusable="false">
      <path d={PLATFORM_ICON_PATHS[platform]} />
    </svg>
  )
}
