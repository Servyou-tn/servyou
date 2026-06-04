// Strip all non-digit characters except leading + (handled separately)
function clean(raw: string): string {
  return raw.replace(/[\s.\-()]/g, '')
}

// Five accepted shapes after cleaning:
//   [2-9]XXXXXXX       bare 8 digits, first digit 2-9
//   0XXXXXXXX          leading-0 (9 digits) → strip 0
//   216XXXXXXXX        216 prefix (11 digits) → prepend +
//   +216XXXXXXXX       canonical (12 chars)
//   00216XXXXXXXX      00216 prefix (13 digits) → replace 00 with +
const BARE8   = /^[2-9][0-9]{7}$/
const LEAD0   = /^0[0-9]{8}$/
const C216    = /^216[0-9]{8}$/
const PLUS216 = /^\+216[0-9]{8}$/
const OO216   = /^00216[0-9]{8}$/

export function isValidPhone(raw: string): boolean {
  const s = clean(raw)
  return BARE8.test(s) || LEAD0.test(s) || C216.test(s) || PLUS216.test(s) || OO216.test(s)
}

export function normalizePhone(raw: string): string {
  const s = clean(raw)
  if (s.startsWith('+216'))  return '+216' + s.slice(4)
  if (s.startsWith('00216')) return '+216' + s.slice(5)
  if (s.startsWith('216'))   return '+216' + s.slice(3)
  if (s.startsWith('0'))     return '+216' + s.slice(1)
  return '+216' + s
}
