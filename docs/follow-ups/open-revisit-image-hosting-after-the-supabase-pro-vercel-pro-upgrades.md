# Revisit image hosting after the Supabase Pro / Vercel Pro upgrades

- **What:** Supabase Pro and Vercel Pro are both being purchased before launch (founder,
  2026-07-31). **On Supabase Pro the Storage image-transformation service becomes available**
  (100 origin images included, then $5 per 1,000), along with **Smart CDN** (automatic cache
  invalidation on replace, which the free tier does not have).
- **Why it is worth revisiting:** today images and their resizing are **split across two systems**
  — the bytes live in Supabase Storage, the resizing happens in Vercel's optimizer. On Pro they
  could live in one. That would collapse the `remotePatterns` + `minimumCacheTTL` + `deviceSizes`
  coupling described in the discovery report §2b into a single provider's cache, and Smart CDN
  would remove the never-overwrite-the-path rule that the current design depends on.
- **NOT a reason to change anything now.** The upload-time downscale and the storage RLS are
  **correct under either arrangement** — the downscale is what protects the storage cap regardless
  of who resizes, and the path-ownership policies do not care. This is an option to evaluate, not
  debt to pay down.
- **Also re-check at that point:** Vercel's Fair Use policy restricts **Hobby to non-commercial
  personal use**, which is a live question for a COD marketplace (discovery report §2a). The Pro
  purchase resolves it; note it as resolved when it lands.
- **Trigger:** after both upgrades are active. Re-run the §2d cost comparison with Pro numbers
  before moving anything.
