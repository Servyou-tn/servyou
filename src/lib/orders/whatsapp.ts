// WhatsApp click-to-chat URL composition, shared by every surface that contacts the other party
// about an order. The pattern was already established twice (E3's OrdersList and MissionDetail);
// this centralises it so the seller surfaces do not make a third copy.

/**
 * Hard ceiling on a composed message, in CHARACTERS of the plain text.
 *
 * Written to the ARABIC budget, not the French one. Percent-encoding is per UTF-8 byte, and every
 * Arabic character is two bytes → six URL characters, while a plain Latin letter costs one.
 * Measured: a 125-char French message encodes to 187 (×1.5); a 100-char Arabic message encodes to
 * 412 (×4.1). wa.me publishes no text limit, so the real ceiling is the URL, and ~2000 characters
 * is the safe cross-browser figure. 300 Arabic characters ≈ 1240 encoded ≈ 1290 with the wa.me
 * prefix — comfortably inside it, with room for a long shop name.
 *
 * Asserted in a test rather than trusted, because a template that overflows only in Arabic is
 * exactly the kind of thing that ships.
 */
export const WHATSAPP_MESSAGE_MAX = 300

/** wa.me wants digits only, country code included. */
export function toWaDigits(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

/**
 * Compose a click-to-chat URL.
 *
 * `encodeURIComponent` is the whole encoding story and it is correct for both locales — verified:
 * `\n` → `%0A` (WhatsApp renders it as a line break), `é` → `%C3%A9`, `ا` → `%D8%A7`, and
 * `decodeURIComponent` round-trips both messages identically.
 *
 * The message is TRUNCATED, not rejected, at WHATSAPP_MESSAGE_MAX: a seller pressing the button
 * must always reach the conversation, and a clipped sentence is a far better failure than a dead
 * button or a URL the browser refuses.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = toWaDigits(phone)
  const trimmed = message.length > WHATSAPP_MESSAGE_MAX
    ? `${message.slice(0, WHATSAPP_MESSAGE_MAX - 1)}…`
    : message
  return `https://wa.me/${digits}?text=${encodeURIComponent(trimmed)}`
}
