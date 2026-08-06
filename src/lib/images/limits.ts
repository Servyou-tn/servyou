// Upload limits, deliberately in their OWN module with no `sharp` import.
//
// The client needs MAX_INPUT_BYTES to reject an oversized file before the request is sent, and
// `normalize.ts` imports `sharp` — a native Node binary that must never be pulled into a client
// bundle. Keeping the numbers here lets both sides share one source of truth without dragging the
// image pipeline across the boundary.

/**
 * Pre-decode ceiling on the RAW upload, set by the DEPLOYMENT, not by preference.
 *
 * **Vercel caps a function's request payload at 4.5 MB.** It is a platform limit — `413
 * FUNCTION_PAYLOAD_TOO_LARGE` — and no `bodySizeLimit` setting raises it. Since an avatar arrives
 * through a server action, that cap is the real ceiling for anything sent this way, so this sits
 * below it with room for the multipart envelope (`bodySizeLimit` is 4.4mb; this is 4mb, so the
 * app's own friendly rejection always fires before the framework's).
 *
 * It is much larger than the 256 KB bucket limit because that limit applies to the re-encoded
 * OUTPUT: a 3.7 MB phone photo normalizes to well under 256 KB.
 *
 * ⚑ This means a phone photo LARGER than 4 MB cannot be uploaded at all today, and modern phone
 * cameras routinely exceed it. The fix is client-side downscaling before upload — the same fix
 * HEIC needs — which removes the server-action payload from the path entirely. Logged in
 * docs/follow-ups.md. Until then the user gets an honest "too large" message rather than a crash.
 */
export const MAX_INPUT_BYTES = 4 * 1024 * 1024

/**
 * Longest-edge cap for avatars. The largest avatar rendered anywhere is 120px (D4's hero, the `2xl`
 * size in ui/avatar.tsx), so 512 serves every surface at better than 4x. The platform-wide ceiling
 * is 2048 for content images; avatars are deliberately tighter because storing 2048px for a 120px
 * surface spends the 1 GB cap -- the binding constraint -- on pixels nothing ever reads.
 */
export const AVATAR_MAX_EDGE = 512

/**
 * Longest-edge cap for product photos, and a MEASURED constraint rather than a judgment call.
 *
 * The `product-images` bucket sets `file_size_limit` to 2 MiB (2097152 bytes, migration
 * 20260731073614). That limit applies to the re-encoded WebP OUTPUT, so the edge cap has to be
 * chosen against it:
 *
 *   edge   worst-case WebP @ q82   share of the 2 MiB bucket cap
 *   512     89 KB                    4%   (= AVATAR_MAX_EDGE — too small, see below)
 *   1280   890 KB                   43%   <- this
 *   2048  2900 KB                  142%   <- OVER the cap. Would fail at upload.
 *
 * ⚑ This overturns `image-storage-discovery.md` §2e, which recommended "~2048px" for content
 * images. The cap and the bucket limit were written in the same PR and never checked against each
 * other: a 2048px product photo cannot be stored in the bucket meant to hold it.
 *
 * Why not reuse AVATAR_MAX_EDGE (512): a product photo is the largest image the marketplace
 * renders. D1's gallery is a full-width hero, not a 120px circle, so 512 would visibly soften it.
 * 1280 covers every product surface at better than 2x and still spends under half the per-file cap.
 */
export const PRODUCT_MAX_EDGE = 1280

/**
 * The same ceiling in whole megabytes, for the user-facing message. Derived rather than written out
 * so the copy cannot drift from the constant — the gate caught exactly that drift once, when the
 * limit moved 15 MB -> 4 MB and the French string kept saying "15 Mo maximum".
 */
export const MAX_INPUT_MB = Math.floor(MAX_INPUT_BYTES / (1024 * 1024))
