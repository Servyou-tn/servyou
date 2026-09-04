import sharp from 'sharp'
import { AVATAR_MAX_EDGE, PRODUCT_MAX_EDGE, SHOP_LOGO_MAX_EDGE, SHOP_BANNER_MAX_EDGE, PORTFOLIO_MAX_EDGE, MAX_INPUT_BYTES } from './limits'

// Normalizes an arbitrary user upload into ONE canonical WebP original.
//
// This module is the platform's real content gate. The bucket's `allowed_mime_types` checks the
// CLIENT-DECLARED Content-Type, so it stops accidents and not attacks; magic-byte sniffing plus a
// full decode/re-encode is what actually establishes that the bytes are an image. A file that is
// not a real image cannot survive `sharp` decoding it, and a re-encoded output cannot carry a
// payload smuggled in the input's container.
//
// It is also the storage-budget gate. Supabase's free tier is 1 GB total, and raw phone photos are
// 3-8 MB -- at 5 MB the whole tier holds ~200 images. Capping the longest edge is what makes the
// "one original, resize at read time" strategy fit at all. See docs/design/image-storage-discovery.md.

export type NormalizeFailure =
  /** HEIC/HEIF -- what an iPhone shoots by DEFAULT. Deserves its own specific message. */
  | 'unsupported_heic'
  /** Magic bytes matched nothing we accept. */
  | 'not_an_image'
  /** Bytes claimed an image format but the decoder rejected them. */
  | 'decode_failed'
  /** Larger than we are willing to even attempt to decode. */
  | 'too_large'

// ⚑ `blob`, NOT `bytes`, AND THE RENAME IS THE POINT — DO NOT "TIDY" IT BACK.
//
// A Node `Buffer` handed to `supabase.storage.upload()` is stringified through UTF-8 by
// storage-js 2.107.0: it falls to the `body = fileBody` branch (dist/index.mjs:620) and every byte
// that is not valid UTF-8 becomes U+FFFD. That is lossy and unrecoverable — the object lands ~1.8x
// inflated with `ef bf bd` littered through it, and no decoder can read it. All five images the
// first seller uploaded are destroyed this way.
//
// A `Blob` takes a DIFFERENT branch (dist/index.mjs:610): storage-js builds FormData and appends
// the blob, which cannot be stringified.
//
// The rename is load-bearing because the type alone would NOT have caught this. storage-js types
// the body as a broad `FileBody` union that accepts Buffer AND Blob, so changing `bytes: Buffer` to
// `bytes: Blob` still compiles at every call site and ships the same bug under a new type. Renaming
// the property is what makes the compiler point at all of them.
export type NormalizeResult =
  | { ok: true; blob: Blob; width: number; height: number }
  | { ok: false; reason: NormalizeFailure }

// Re-exported so server-side callers have one import for the whole pipeline. The definitions live
// in ./limits because the client needs MAX_INPUT_BYTES and must not import `sharp`.
export { AVATAR_MAX_EDGE, PRODUCT_MAX_EDGE, PORTFOLIO_MAX_EDGE, MAX_INPUT_BYTES, MAX_INPUT_MB } from './limits'

/**
 * Identifies a container from its leading bytes. Deliberately not a general-purpose sniffer -- it
 * recognises exactly what we accept, plus HEIC, which we recognise ONLY so we can refuse it with a
 * message that names the fix instead of a generic failure.
 */
export function sniffFormat(
  buf: Buffer,
): 'jpeg' | 'png' | 'webp' | 'avif' | 'heic' | 'isobmff' | 'unknown' {
  if (buf.length < 12) return 'unknown'

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png'
  }

  // WebP is RIFF-based, not ISO-BMFF -- check it before the ftyp branch so it can never be
  // mistaken for a HEIF brand.
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp'
  }

  // ISO-BMFF: 4-byte box size, then 'ftyp', then the major brand.
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii')

    // AVIF is decodable by this build (verified: av1-compressed HEIF round-trips), so it is
    // ACCEPTED rather than refused.
    if (brand === 'avif' || brand === 'avis') return 'avif'

    // The brand set iOS actually emits. These are HEVC-compressed and this build cannot decode
    // them -- see normalizeAvatar's note.
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'].includes(brand)) {
      return 'heic'
    }

    // 'mif1'/'msf1' are the GENERIC HEIF image brands and are genuinely ambiguous -- both AVIF and
    // HEVC-HEIC files appear with them in the wild. Deliberately not guessed here; normalizeAvatar
    // attempts the decode and lets the outcome decide, so an AVIF is not refused as HEIC and an
    // HEVC file still gets the iPhone-specific message.
    return 'isobmff'
  }

  return 'unknown'
}

/**
 * Decode → auto-orient → downscale → re-encode as WebP.
 *
 * HEIC is refused rather than converted, and the reason is subtler than "sharp lacks HEIF support".
 * Measured against the installed sharp 0.35.3:
 *
 *   sharp.format.heif.input.buffer === true      <-- claims HEIF input works
 *   .heif({compression:'av1'})  -> encodes AND decodes (brand 'avif')
 *   .heif({compression:'hevc'}) -> "heifsave: Unsupported compression"
 *
 * So the HEIF CONTAINER is supported and the HEVC CODEC is not -- and HEVC is exactly what an
 * iPhone writes. The capability flag reads `true` and the format is still undecodable. Anyone
 * re-checking `format.heif.input` will reach the wrong conclusion; test an actual HEVC round-trip.
 *
 * Refusing with a message that names the iOS setting beats a decode error the user cannot act on.
 * Logged in docs/follow-ups.md; the real fix is client-side conversion before upload.
 */
export async function normalizeAvatar(input: Buffer, maxEdge = AVATAR_MAX_EDGE): Promise<NormalizeResult> {
  if (input.length > MAX_INPUT_BYTES) return { ok: false, reason: 'too_large' }

  const format = sniffFormat(input)
  if (format === 'heic') return { ok: false, reason: 'unsupported_heic' }
  if (format === 'unknown') return { ok: false, reason: 'not_an_image' }

  try {
    const { data, info } = await sharp(input)
      // No-arg rotate() applies the EXIF orientation tag and then drops it. Without this, portrait
      // phone photos re-encode sideways, because stripping metadata (below) would otherwise remove
      // the orientation the renderer was relying on.
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: 'inside',
        // Never upscale: a 96px source stays 96px rather than being interpolated up to 512 and
        // charged for the bytes.
        withoutEnlargement: true,
      })
      // sharp drops all metadata unless withMetadata() is called. That default is load-bearing
      // here, not incidental: phone photos routinely carry EXIF GPS, and an avatar is a PUBLIC
      // object. Do not add withMetadata() to this pipeline.
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true })

    // Wrapped HERE rather than at the two call sites, so there is exactly one place the upload body
    // is constructed and no caller can reintroduce a raw Buffer. The `type` is what carries the
    // content type across the FormData branch storage-js takes for a Blob.
    return {
      ok: true,
      blob: new Blob([data], { type: 'image/webp' }),
      width: info.width,
      height: info.height,
    }
  } catch {
    // An ambiguous ISO-BMFF file that fails to decode is, in practice, an HEVC-compressed HEIC --
    // the generic 'mif1'/'msf1' brands are the other way iOS files present. Reporting it as HEIC
    // gives the user the actionable iOS-setting message instead of a dead-end "file corrupt".
    if (format === 'isobmff') return { ok: false, reason: 'unsupported_heic' }

    // Bytes passed the magic-byte check but the decoder refused them -- truncated, corrupt, or a
    // header glued onto something that is not an image. This is the branch that catches a crafted
    // file, which is why the sniffer alone is not the gate.
    return { ok: false, reason: 'decode_failed' }
  }
}

/**
 * Product-photo variant of the same pipeline.
 *
 * Deliberately a THIN WRAPPER and not a copy: the decode / auto-orient / strip-EXIF / re-encode
 * sequence is the content gate, and a second implementation of it is a second thing to get wrong.
 * The only difference a product photo wants is the edge cap (PRODUCT_MAX_EDGE 1280 vs the avatar's
 * 512), which normalizeAvatar already takes as a parameter.
 *
 * `normalizeAvatar` keeps its name on purpose. Renaming it to something neutral would touch the
 * avatar call site and every test that names it, for no behaviour change -- and the name is honest
 * about which surface the defaults were chosen for.
 *
 * ⚑ EXIF-stripping is load-bearing here for the same reason as avatars, and arguably more: a
 * product photo is taken at the seller's home or shop and is PUBLIC. Do not add withMetadata().
 */
export async function normalizeProductImage(input: Buffer): Promise<NormalizeResult> {
  return normalizeAvatar(input, PRODUCT_MAX_EDGE)
}

/**
 * Shop logo variant — G2 "Créer ma boutique". Same thin-wrapper reasoning as
 * normalizeProductImage: the decode/auto-orient/strip-EXIF/re-encode sequence is the content
 * gate, and a second implementation of it is a second thing to get wrong.
 */
export async function normalizeShopLogo(input: Buffer): Promise<NormalizeResult> {
  return normalizeAvatar(input, SHOP_LOGO_MAX_EDGE)
}

/**
 * Shop banner variant — G2 "Créer ma boutique". Same thin wrapper, content-image edge cap.
 */
export async function normalizeShopBanner(input: Buffer): Promise<NormalizeResult> {
  return normalizeAvatar(input, SHOP_BANNER_MAX_EDGE)
}

/**
 * Portfolio-item image variant — H3 "Portfolio". Same thin wrapper, content-image edge cap.
 */
export async function normalizePortfolioImage(input: Buffer): Promise<NormalizeResult> {
  return normalizeAvatar(input, PORTFOLIO_MAX_EDGE)
}
