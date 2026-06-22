// Inline SVG icons for the /marche listing cards' circular CTA buttons. The project
// deliberately avoids lucide-react (same convention as the other local icon modules);
// these are lucide path data inlined, sharing the stroke base below.
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

// Product card CTA — "view product" (arrow up-right).
export function ArrowUpRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  )
}

// Service card CTA — "view service" (arrow right).
export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
