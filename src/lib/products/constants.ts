// Shared constants and result types for the product write path.
//
// ⚑ THESE CANNOT LIVE IN `src/app/actions/products.ts`. A `'use server'` module may export ONLY
// async functions — Next.js strips everything else and the module then resolves with NO exports at
// all, so even the server actions become unimportable. The build error names the *action* as
// missing, which points at the wrong file entirely; the real cause is a non-async export sitting
// beside it. Keep values and types here, actions there.

/**
 * Gallery maximum for G6 / G7. `product_images` has no constraint on row count — this is the form's
 * rule, enforced in `CreateProductInput` (Zod `.max()`) and mirrored in the grid's "add" affordance.
 */
export const MAX_PRODUCT_IMAGES = 8

export type ProductActionResult = { ok: true } | { ok: false; error: string }

export type UploadImageResult =
  | { ok: true; path: string; url: string }
  | { ok: false; error: string }
