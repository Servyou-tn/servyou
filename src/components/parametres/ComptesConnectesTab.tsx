'use client'

import { Globe, Link as LinkIcon } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// I2 « Comptes connectés » — Figma 423:17360, UI only: every provider is « Bientôt », nothing connects.
// Measured from the dump: panel (surface/base, border-subtle, r12, p24, gap24) holding the large Empty
// State (r16, border-subtle, 48/40 padding, gap20, 112px sunken circle + 64px link glyph, 20/Semi Bold
// title, 16 body) and three provider rows (r8, border-subtle, p16, gap12, name 16/Medium + a « Bientôt »
// category badge r8 · 4/12 padding · 14/Medium).
//
// ⚑ The three rows sit at OPACITY 0.5 — the dump does not record it. Measured from the frame's pixels:
// the Facebook label's darkest pixel is (135,139,148) = text/primary (15,23,42) at exactly 50% on white,
// the badge text (163,170,180) = text/secondary at 50%, the badge fill (248,250,252) = surface/sunken at 50%.
// They read as disabled, which is the point of « Bientôt ».
//
// Route-local, not shared/ui: this is the first consumer of the big-circle Empty State (marche/EmptyState
// is a different card — shadow, no circle, 16px title) and of the brand glyphs. lucide-react 1.x ships no
// brand icons, hence the two inline SVGs.

const PROVIDERS = [
  { key: 'facebook', name: 'Facebook', Icon: FacebookIcon },
  { key: 'google', name: 'Google', Icon: GoogleIcon },
  { key: 'instagram', name: 'Instagram', Icon: InstagramIcon },
] as const

export function ComptesConnectesTab() {
  const lang = useLang()

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border-subtle bg-surface-base p-6">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-surface-base px-6 py-10 text-center sm:px-10 sm:py-12">
        <div className="flex size-28 shrink-0 items-center justify-center rounded-full bg-surface-sunken" aria-hidden="true">
          {/* The frame's glyph measures ≈57px at 2px absolute stroke; lucide's Link fills ~75% of its box. */}
          <LinkIcon size={76} strokeWidth={2} absoluteStrokeWidth className="text-text-muted" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">{t('parametres.comptes.title', lang)}</h2>
        <p className="text-base text-text-muted">{t('parametres.comptes.body', lang)}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {PROVIDERS.map(({ key, name, Icon }) => (
          <li
            key={key}
            className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-base p-4 opacity-50"
          >
            <span className="flex items-center gap-3">
              <Icon />
              <span className="text-base font-medium text-text-primary">{name}</span>
            </span>
            <span className="rounded-lg bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary">
              {t('parametres.comptes.soon', lang)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Facebook: filled disc + « f » (text/secondary). Path = Simple Icons' Facebook glyph, 24×24.
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0 text-text-secondary" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

// Google: the frame uses the neutral globe (icon-globe, text/muted), not the multicolour « G ».
function GoogleIcon() {
  return <Globe className="size-6 shrink-0 text-text-muted" aria-hidden="true" />
}

// Instagram: rounded square + lens + flash dot, 2px stroke (text/secondary).
function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 shrink-0 text-text-secondary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}
