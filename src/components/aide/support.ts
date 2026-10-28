// Servyou support contacts used by /aide (contact panel + the no-result state).

// The only support e-mail in the product (contact page, legal pages, FAQ all use it).
export const SUPPORT_EMAIL = 'bonjour@servyou.tn'

// ⚑ LAUNCH BLOCKER — the real support WhatsApp number is not confirmed anywhere in the repo: the /contact
// page still carries the placeholder `https://wa.me/216XXXXXXXX` (src/app/(marketing)/contact/page.tsx) and
// the number shown there is « +216 XX XXX XXX ». Until it is confirmed this points to /contact (an existing
// page that lists the channels) instead of a dead or invented wa.me link — the same interim the old /aide used.
// When the number lands, change it HERE and in the contact page: `https://wa.me/216XXXXXXXX`.
export const SUPPORT_WHATSAPP_HREF = '/contact'
