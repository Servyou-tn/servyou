// Derives the object path from a stored public URL ({shopId}/{kind}/{uuid}.webp for shop assets) so a replaced
// object can be deleted without a second column just to remember its path. Returns null on anything that doesn't
// match the expected shape; callers treat that as "nothing to clean up" rather than an error, since a malformed URL
// should never block the caller.
//
// Moved here from ma-boutique/modifier/actions.ts (a 'use server' file may only export async functions) so the
// create-shop upload can share it (audit 2026-11-11 M5).
export function pathFromPublicUrl(url: string | null, bucket: string): string | null {
  if (!url) return null
  const marker = `/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  // Verified against this project's actual getPublicUrl() output: no query string today. Stripped
  // defensively anyway — a future transform/query-carrying URL shape must not corrupt the path.
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}
