// Inline SVG icons for the landing page (no lucide-react, same approach as the
// navbar). Stroke icons share a base; the Tunisia flag is a small fill mark.
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

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

export function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// Stylized Tunisian flag mark: red rounded square with a white crescent (the
// crescent is carved by overlapping a red circle over a white one).
export function TunisiaFlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <rect width="24" height="24" rx="5" fill="#E70013" />
      <circle cx="12" cy="12" r="6" fill="#FFFFFF" />
      <circle cx="13.5" cy="12" r="4.8" fill="#E70013" />
    </svg>
  )
}
