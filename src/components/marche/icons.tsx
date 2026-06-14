// Inline SVG icons for the /marche marketplace shell. The project deliberately
// avoids lucide-react (same convention as src/components/landing/icons.tsx and
// src/components/dashboard/consumer/icons.tsx); these are lucide path data inlined,
// sharing the stroke base below. Kept local to /marche so the marketplace shell is
// decoupled from the dashboard component tree (reserved for the seller dashboards).
import type { SVGProps } from 'react'

const stroke: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

// "Marché" — the marketplace browse page (storefront glyph).
export function StorefrontIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
    </svg>
  )
}

// Sidebar footer — "Déconnexion".
export function LogOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  )
}

// Collapse toggle (shown when the sidebar is expanded).
export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

// Expand toggle (shown when the sidebar is collapsed).
export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
