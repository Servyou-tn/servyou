import { Info } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

// « Disponible après acceptation par le vendeur / le freelance » — what the buyer sees INSTEAD of the WhatsApp button while the order (or request) is still
// pending: the other side's number is revealed once they accept (lib/orders/phone-visibility.ts). Plain text, no control, so it can never be a broken button.
export function PhoneAfterAcceptance({ who, lang, className = '' }: { who: 'seller' | 'freelancer'; lang: Lang; className?: string }) {
  return (
    <p className={`flex items-center gap-2 rounded-lg bg-surface-subtle px-3 py-2 text-body-sm text-text-muted ${className}`}>
      <Info className="size-4 shrink-0" aria-hidden="true" />
      <span>{t(`phone.after_acceptance.${who}`, lang)}</span>
    </p>
  )
}
