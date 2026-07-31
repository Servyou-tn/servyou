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
 * The same ceiling in whole megabytes, for the user-facing message. Derived rather than written out
 * so the copy cannot drift from the constant — the gate caught exactly that drift once, when the
 * limit moved 15 MB -> 4 MB and the French string kept saying "15 Mo maximum".
 */
export const MAX_INPUT_MB = Math.floor(MAX_INPUT_BYTES / (1024 * 1024))
