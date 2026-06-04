const PHONE_RE = /^(\+216)?[0-9]{8}$/

export function isValidPhone(raw: string): boolean {
  return PHONE_RE.test(raw.replace(/\s+/g, ''))
}

export function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '')
  return cleaned.startsWith('+') ? cleaned : `+216${cleaned}`
}
