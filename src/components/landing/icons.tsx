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

export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// ─── Category icons (landing Categories grid) ───────────────────────────────
// Exact lucide v1.18.0 path data, inlined to honour the no-lucide-react rule.
// Default stroke-width 1.75 (lighter than the 2 base) for the airy card look;
// callers may still override via props.

export function ShirtIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} strokeWidth={1.75} {...props}>
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  )
}

export function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} strokeWidth={1.75} {...props}>
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </svg>
  )
}

export function SmartphoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} strokeWidth={1.75} {...props}>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}

export function SofaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} strokeWidth={1.75} {...props}>
      <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
      <path d="M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z" />
      <path d="M4 18v2" />
      <path d="M20 18v2" />
      <path d="M12 4v9" />
    </svg>
  )
}

export function VideoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} strokeWidth={1.75} {...props}>
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  )
}

export function PaletteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} strokeWidth={1.75} {...props}>
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  )
}

export function MegaphoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} strokeWidth={1.75} {...props}>
      <path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
      <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" />
      <path d="M8 6v8" />
    </svg>
  )
}

export function CodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} strokeWidth={1.75} {...props}>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </svg>
  )
}

export function MicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} strokeWidth={1.75} {...props}>
      <path d="M12 19v3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <rect x="9" y="2" width="6" height="13" rx="3" />
    </svg>
  )
}

export function ArrowUpRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} strokeWidth={1.75} {...props}>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
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
