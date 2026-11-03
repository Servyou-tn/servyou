// A price field's raw value has at most two decimals — numeric(10,2) would silently round 12.345, so the server
// refuses it (multipleOf(0.01), src/app/actions/products.ts) and the forms say so at the field first.
export function hasAtMostTwoDecimals(raw: string): boolean {
  return /^\d+(\.\d{0,2})?$/.test(raw.trim())
}
