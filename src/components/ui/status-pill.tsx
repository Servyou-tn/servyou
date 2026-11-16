import * as React from 'react'
import { cn } from '@/lib/utils'

// StatusPill — F3 primitive, measured from Figma COMPONENT_SET 41:694 (37 statuses), token-bound,
// boundary-compliant. A non-interactive pill: rounded-full, 12px Semi Bold, colour by status.
//
// Role vs status: the three role badges (client / freelance / boutique) are three of the 37 status
// values and enter through the SAME `status` prop — the primitive NEVER reads seller_type (boundary
// rule 3b). Call sites resolve seller_type → role via the @/lib/roles resolver and pass the result.
//
// The LABEL is children, not baked: status labels are scattered per-feature in i18n (fr.ts/ar.ts) and
// must exist in both FR and AR, so the caller passes the translated text. The primitive owns colour
// only. a11y (accessibility.md §StatusPill): status is carried by the TEXT, never colour alone —
// hence children are required — and the pill is non-interactive. `whitespace-nowrap` keeps long labels
// ("En attente d'approbation") on one line.

export type StatusValue =
  | 'active' | 'pending' | 'pending-review' | 'paused' | 'draft' | 'delivered' | 'in-transit'
  | 'processing' | 'in-progress' | 'completed' | 'cancelled' | 'declined' | 'withdrawn' | 'verified'
  | 'new' | 'best-seller' | 'sale' | 'stock-faible' | 'rupture-stock' | 'acceptee' | 'expediee'
  | 'arrivee' | 'ouverte' | 'pourvue' | 'expiree' | 'disponible' | 'occupe' | 'vacances' | 'suspendu'
  | 'masqué' | 'préparée' | 'reçue' | 'annulée' | 'refusée' | 'freelance' | 'boutique' | 'client'
  | 'optional' | 'complete' | 'moderated'

type StatusTone =
  | 'success' | 'warning' | 'info' | 'info-strong' | 'accent' | 'neutral' | 'muted' | 'danger'
  | 'solid-success' | 'solid-accent' | 'highlight'

// Tone → tokens (Figma bindings: $success/$warning/$indigo/$blue/$danger/100+500, $surface/sunken,
// $text/secondary+muted+inverse+primary, $rating-yellow).
// Every tone's text is ≥ 4.5:1 on its own fill (WCAG 2.2 AA, 1.4.3 — the pill text is 12px, not « large »; journey walk S2).
// The fills are unchanged; the TEXT takes the scale's 700 step (or text-secondary), which already exists in the Figma tokens:
//   warning 1.93 → 6.37 · success 3.00 → 6.49 · info 4.44 → 6.29 · accent 3.85 → 6.88 · muted 4.34 → 6.92 ·
//   danger 3.26 → 6.21 · solid-success (white on green) 3.30 → 7.13.
// One map, so every pill on every page moves together — no per-page override.
export const TONE: Record<StatusTone, string> = {
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  info: 'bg-brand-blue-100 text-brand-blue-700',
  'info-strong': 'bg-brand-blue-100 text-brand-blue-700',
  accent: 'bg-brand-indigo-100 text-brand-indigo-700',
  neutral: 'bg-surface-sunken text-text-secondary',
  muted: 'bg-surface-sunken text-text-secondary',
  danger: 'bg-danger-100 text-danger-700',
  'solid-success': 'bg-success-700 text-text-inverse',
  'solid-accent': 'bg-brand-indigo-500 text-text-inverse',
  highlight: 'bg-rating-yellow text-text-primary',
}

const STATUS_TONE: Record<StatusValue, StatusTone> = {
  active: 'success', delivered: 'success', verified: 'success', disponible: 'success', 'reçue': 'success',
  pending: 'warning', 'pending-review': 'warning', processing: 'warning', 'stock-faible': 'warning', occupe: 'warning',
  'in-transit': 'info', 'in-progress': 'info', acceptee: 'info', expediee: 'info', arrivee: 'info', 'préparée': 'info',
  ouverte: 'info-strong',
  completed: 'accent', pourvue: 'accent', freelance: 'accent', boutique: 'accent',
  paused: 'neutral', draft: 'neutral', expiree: 'neutral', vacances: 'neutral', client: 'neutral',
  withdrawn: 'muted', 'masqué': 'muted',
  cancelled: 'danger', declined: 'danger', 'rupture-stock': 'danger', suspendu: 'danger', 'annulée': 'danger', 'refusée': 'danger',
  // H5, founder-ruled (not measured — the Figma component set has only active/paused). Danger, not
  // neutral: a moderated listing needs to read as visually distinct from an ordinary self-pause,
  // since the owner cannot reactivate it themselves (enforce_admin_moderation_lock).
  moderated: 'danger',
  new: 'solid-success',
  sale: 'solid-accent',
  'best-seller': 'highlight',
  optional: 'neutral',
  complete: 'success',
}

const BASE = 'inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold'

export type StatusPillProps = {
  status: StatusValue
  /** The translated label (required — status is conveyed by text, never colour alone). */
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>

export function StatusPill({ status, className, children, ...props }: StatusPillProps) {
  return (
    <span {...props} className={cn(BASE, TONE[STATUS_TONE[status]], className)}>
      {children}
    </span>
  )
}
