// Servyou support contacts used by /aide (contact panel + the no-result state).

// The only support e-mail in the product (contact page, legal pages, FAQ all use it).
export const SUPPORT_EMAIL = 'bonjour@servyou.tn'

// There is no public support WhatsApp number: the /contact page no longer shows a WhatsApp channel at all
// (founder decision 2026-11-15 — its placeholder `wa.me/216XXXXXXXX` and « +216 XX XXX XXX » are gone). So this
// points to /contact (the e-mail, the form and the social accounts) instead of a dead or invented wa.me link.
// If a number is confirmed one day, change it HERE (`https://wa.me/216…`) and add the channel back to /contact.
export const SUPPORT_WHATSAPP_HREF = '/contact'
