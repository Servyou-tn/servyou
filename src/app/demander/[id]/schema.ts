import { z } from 'zod'
import { isValidPhone } from '@/lib/phone'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import {
  DELIVERY_NAME_MAX,
  DELIVERY_STREET_MAX,
  QUARTIER_MAX,
  VILLE_MAX,
  PRODUCT_NOTE_MAX,
  QUANTITY_MAX,
  SERVICE_DESCRIPTION_MIN,
  SERVICE_DESCRIPTION_MAX,
  TIMEFRAME_MAX,
  PHONE_INPUT_MAX,
  BUYER_NOTE_TAG,
  TIMEFRAME_ALLOWED,
  isValidBudget,
} from './limits'

// Server-side input schemas for the two E1 request actions (actions.ts). Split out because a
// 'use server' file may only export async functions; tests import the schemas directly. The caps
// themselves live in ./limits.ts, shared with the forms' `maxLength`.
//
// Two of the fields are folded into ONE text column each and parsed back later, so the schema
// also rejects what would corrupt that fold — see src/lib/marche/order-detail.ts:
//   delivery_address = "{street}\n{quartier}\n{ville}, {governorate}" — a line break inside any of
//     street/quartier/ville would shift every field after it, so those (and the name) are
//     single-line;
//   buyer_note = "{description}\n\n[Délai: {timeframe}]\n[Budget: {n} TND]" — a `]` or line break
//     in the timeframe, or a literal tag marker in the description, would mis-split it.
// The buyer_note rules and the budget bound live in ./limits.ts too, so ServiceRequestForm runs the
// very same predicates in the browser.

const NO_LINE_BREAK = /^[^\r\n]*$/

const singleLine = (max: number) => z.string().trim().min(1).max(max).regex(NO_LINE_BREAK)
const phone = z.string().max(PHONE_INPUT_MAX).refine(isValidPhone)

export const ProductRequestSchema = z.object({
  productId: z.string().uuid(),
  deliveryName: singleLine(DELIVERY_NAME_MAX),
  deliveryStreet: singleLine(DELIVERY_STREET_MAX),
  quartier: singleLine(QUARTIER_MAX),
  ville: singleLine(VILLE_MAX),
  governorate: z
    .string()
    .trim()
    .refine((g) => GOVERNORATES.some((x) => x.value === g)),
  deliveryPhone: phone,
  // Tracked stock is checked against the live row in the action; this is the ceiling for a
  // "Toujours disponible" product, which has no stock to bound it.
  quantity: z.number().int().min(1).max(QUANTITY_MAX),
  note: z.string().trim().max(PRODUCT_NOTE_MAX),
})

export const ServiceRequestSchema = z.object({
  serviceId: z.string().uuid(),
  description: z
    .string()
    .trim()
    .min(SERVICE_DESCRIPTION_MIN)
    .max(SERVICE_DESCRIPTION_MAX)
    .refine((d) => !BUYER_NOTE_TAG.test(d)),
  timeframe: z.string().trim().max(TIMEFRAME_MAX).regex(TIMEFRAME_ALLOWED),
  // A text input: '' means "not given". Anything else must be a finite amount in 0..BUDGET_MAX.
  budget: z
    .string()
    .trim()
    .refine(isValidBudget)
    .transform((v) => (v === '' ? null : Number(v))),
  phone,
})
