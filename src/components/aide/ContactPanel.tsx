import Link from 'next/link'
import { Mail } from 'lucide-react'
import { VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_HREF } from './support'
import { WhatsAppGlyph } from './WhatsAppGlyph'

// « Vous n'avez pas trouvé ? » — Figma contact panel 449:18512 (368 wide, surface/base, border-subtle, r12,
// padding 24, gap 24): heading + subline · two channels (WhatsApp lg CTA + « Réponse sous 24 h », e-mail
// secondary button + the address) · divider · legal links. Static — a server component.
//
// WhatsApp CTA = the WhatsApp Button lg (134:8027): wa-brand fill with text-primary (dark on green passes AA;
// white fails). The e-mail button reuses the secondary Button's variant classes. Both are composed WITHOUT
// Button's BASE: it forces every child svg to 16px (`[&_svg]:size-4`), and the frame's glyphs are 20px.
const LINK_BUTTON = cn(
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-5 text-base transition-colors motion-reduce:transition-none',
  FOCUS_RING,
)

const LEGAL: { href: string; key: string }[] = [
  { href: '/conditions', key: 'aide.legal.terms' },
  { href: '/confidentialite', key: 'aide.legal.privacy' },
  { href: '/cookies', key: 'aide.legal.cookies' },
  { href: '/accessibilite', key: 'aide.legal.accessibility' },
]

export function ContactPanel({ lang }: { lang: Lang }) {
  return (
    <aside
      aria-labelledby="aide-contact-heading"
      className="flex flex-col gap-6 rounded-xl border border-border-subtle bg-surface-base p-6"
    >
      <div className="flex flex-col gap-2">
        <h2 id="aide-contact-heading" className="text-xl font-semibold text-text-primary">
          {t('aide.contact.title', lang)}
        </h2>
        <p className="text-body-sm text-text-secondary">{t('aide.contact.subtitle', lang)}</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Link
            href={SUPPORT_WHATSAPP_HREF}
            className={cn(LINK_BUTTON, 'bg-wa-brand font-semibold text-text-primary hover:bg-wa-brand-hover')}
          >
            <WhatsAppGlyph />
            {t('aide.contact.whatsapp', lang)}
          </Link>
          <p className="text-caption font-medium text-text-muted">{t('aide.contact.responseTime', lang)}</p>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={cn(LINK_BUTTON, VARIANT_BASE.secondary, VARIANT_STATE.secondary)}
          >
            <Mail className="size-5 shrink-0" aria-hidden="true" />
            {t('aide.contact.email', lang)}
          </a>
          {/* an e-mail address is LTR text even inside an RTL page */}
          <p dir="ltr" className="text-start text-caption font-medium text-text-muted rtl:text-end">
            {SUPPORT_EMAIL}
          </p>
        </div>
      </div>

      <hr className="border-border-subtle" />

      <nav aria-label={t('aide.legal.title', lang)} className="flex flex-col gap-3">
        <p className="text-caption font-medium uppercase text-text-muted">{t('aide.legal.title', lang)}</p>
        {LEGAL.map(({ href, key }) => (
          <Link key={href} href={href} className="w-fit text-body-sm text-brand-blue-600 hover:underline">
            {t(key, lang)}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
