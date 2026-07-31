/**
 * `normalizeAvatar` is the platform's real content gate for user-uploaded images, which makes it
 * must-test on two counts of the testing discipline: it is a security-sensitive transformation, and
 * it is the only thing standing between arbitrary uploaded bytes and a public storage bucket.
 *
 * The bucket's `allowed_mime_types` does NOT cover this. It checks the client-declared
 * Content-Type, which anyone can set to `image/webp` on arbitrary bytes. What actually establishes
 * "these bytes are an image" is magic-byte sniffing plus a full decode/re-encode — so the
 * load-bearing assertions here are the REJECTIONS, not the happy path.
 *
 * The HEIC cases are their own category. HEIC is what an iPhone shoots by default, against a
 * documented 70%+ mobile-first market, so misclassifying it costs a real user a real upload with a
 * message they cannot act on. Two separate paths reach that verdict (explicit brand, and an
 * ambiguous ISO-BMFF brand that fails to decode) and both are covered.
 */

import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { normalizeAvatar, sniffFormat, MAX_INPUT_BYTES, AVATAR_MAX_EDGE } from '@/lib/images/normalize'

/** A real, decodable raster of the requested size. */
async function realImage(width: number, height: number, format: 'png' | 'jpeg' | 'webp' = 'png') {
  const img = sharp({
    create: { width, height, channels: 3, background: { r: 12, g: 90, b: 224 } },
  })
  return format === 'png' ? img.png().toBuffer() : format === 'jpeg' ? img.jpeg().toBuffer() : img.webp().toBuffer()
}

/** An ISO-BMFF header with an arbitrary major brand, followed by nothing decodable. */
function isoBmff(brand: string): Buffer {
  return Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]), // box size
    Buffer.from('ftyp', 'ascii'),
    Buffer.from(brand, 'ascii'),
    Buffer.alloc(16),
  ])
}

describe('sniffFormat', () => {
  it('identifies the four formats we accept', async () => {
    expect(sniffFormat(await realImage(8, 8, 'png'))).toBe('png')
    expect(sniffFormat(await realImage(8, 8, 'jpeg'))).toBe('jpeg')
    expect(sniffFormat(await realImage(8, 8, 'webp'))).toBe('webp')

    // AVIF is produced through the same HEIF container as HEIC but with av1 compression, which
    // this sharp build CAN decode — so it must be accepted, not swept up with HEIC.
    const avif = await sharp(await realImage(8, 8)).heif({ compression: 'av1' }).toBuffer()
    expect(sniffFormat(avif)).toBe('avif')
  })

  it('flags every HEIF brand an iPhone emits as heic', () => {
    for (const brand of ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']) {
      expect(sniffFormat(isoBmff(brand))).toBe('heic')
    }
  })

  it('does not guess on the generic HEIF brands', () => {
    // 'mif1'/'msf1' are genuinely ambiguous — both AVIF and HEVC-HEIC appear with them. Guessing
    // either way misreports one of the two, so the decode result decides instead.
    expect(sniffFormat(isoBmff('mif1'))).toBe('isobmff')
    expect(sniffFormat(isoBmff('msf1'))).toBe('isobmff')
  })

  it('rejects non-images and runt buffers without throwing', () => {
    expect(sniffFormat(Buffer.from('#!/bin/sh\nrm -rf /', 'utf8'))).toBe('unknown')
    expect(sniffFormat(Buffer.from('%PDF-1.7', 'utf8'))).toBe('unknown')
    expect(sniffFormat(Buffer.alloc(0))).toBe('unknown')
    expect(sniffFormat(Buffer.from([0xff, 0xd8]))).toBe('unknown') // truncated JPEG magic
  })
})

describe('normalizeAvatar — rejections (the actual gate)', () => {
  it('refuses HEIC by brand, so the caller can show the iOS-setting message', async () => {
    const result = await normalizeAvatar(isoBmff('heic'))
    expect(result).toEqual({ ok: false, reason: 'unsupported_heic' })
  })

  it('reports an undecodable ambiguous ISO-BMFF file as HEIC, not as corrupt', async () => {
    // This is the branch that matters for real users: an iPhone file presenting as 'mif1' must
    // still produce the actionable message rather than a dead-end "image endommagée".
    const result = await normalizeAvatar(isoBmff('mif1'))
    expect(result).toEqual({ ok: false, reason: 'unsupported_heic' })
  })

  it('refuses bytes that are not an image at all', async () => {
    const result = await normalizeAvatar(Buffer.from('GIF89a<script>alert(1)</script>', 'utf8'))
    expect(result).toEqual({ ok: false, reason: 'not_an_image' })
  })

  it('refuses a forged header glued onto non-image bytes', async () => {
    // The case bucket mime-type checking cannot catch: valid JPEG magic bytes, garbage payload.
    // Sniffing alone would pass this; only the decode rejects it.
    const forged = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 0x41)])
    const result = await normalizeAvatar(forged)
    expect(result).toEqual({ ok: false, reason: 'decode_failed' })
  })

  it('refuses an oversized upload before attempting to decode it', async () => {
    const huge = Buffer.alloc(MAX_INPUT_BYTES + 1)
    const result = await normalizeAvatar(huge)
    expect(result).toEqual({ ok: false, reason: 'too_large' })
  })
})

describe('normalizeAvatar — normalization', () => {
  it('re-encodes to WebP and caps the longest edge', async () => {
    const result = await normalizeAvatar(await realImage(2000, 1000))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.width).toBe(AVATAR_MAX_EDGE)
    expect(result.height).toBe(AVATAR_MAX_EDGE / 2) // aspect ratio preserved
    expect(sniffFormat(result.bytes)).toBe('webp')
  })

  it('never upscales a small source', async () => {
    // A 96px avatar must stay 96px rather than being interpolated up to 512 and charged for the
    // bytes — the storage cap is the binding constraint.
    const result = await normalizeAvatar(await realImage(96, 96))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.width).toBe(96)
    expect(result.height).toBe(96)
  })

  it('strips metadata, because an avatar is a PUBLIC object and phone photos carry EXIF GPS', async () => {
    const withGps = await sharp(await realImage(600, 600))
      .withMetadata({ exif: { IFD0: { Copyright: 'servyou-test', Artist: 'gps-stand-in' } } })
      .jpeg()
      .toBuffer()

    // Guard the fixture itself: if sharp stopped writing the EXIF, the assertion below would pass
    // vacuously and the privacy property would silently stop being tested.
    expect((await sharp(withGps).metadata()).exif).toBeDefined()

    const result = await normalizeAvatar(withGps)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect((await sharp(result.bytes).metadata()).exif).toBeUndefined()
  })

  it('applies EXIF orientation before discarding it, so portrait photos are not sideways', async () => {
    // orientation 6 = rotate 90°. A 400x200 source must come back 200x400.
    const rotated = await sharp(await realImage(400, 200))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()

    const result = await normalizeAvatar(rotated)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.width).toBe(200)
    expect(result.height).toBe(400)
  })

  it('produces output that fits the avatars bucket file_size_limit', async () => {
    // The bucket caps objects at 256 KB. A photographic worst case must clear it, or uploads fail
    // at the storage layer after passing every app-side check.
    const noisy = await sharp({
      create: { width: 1600, height: 1600, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 60 } },
    })
      .jpeg({ quality: 100 })
      .toBuffer()

    const result = await normalizeAvatar(noisy)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.bytes.byteLength).toBeLessThan(262144)
  })
})
