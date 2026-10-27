# G6 image rendering (`fix/g6-figma-fidelity`, 2026-08-06)

## 🔴 `next/image` 400s on EVERY Supabase URL in local dev — NAT64, not `remotePatterns`

- **The symptom is a blank image, and the error message lies about the cause.** Any `<Image>` whose
  `src` is an `xggomcitqrkaylqezjjz.supabase.co` URL requests `/_next/image?url=<supabase>`, which
  returns **400**. The `<img>` ends up `complete: true` with `naturalWidth: 0` — a blank tile, no
  console error at the component. Diagnosed on the G6 upload grid (`ImageUploadGrid`), where three
  freshly uploaded thumbnails rendered blank.
- ⚑ **It is NOT the `remotePatterns` allowlist, although the 400 reports the identical message.**
  Do not re-audit `next.config.ts`. `remotePatterns` is correct and applied — verified three ways:
  the *resolved* build config contains the entry verbatim, Next's own `matchRemotePattern` returns
  `true` for this exact pattern + URL, and the `deviceSizes`/`qualities` trimming demonstrably bites
  on a local image that optimizes fine. All three passed while the 400 persisted.
- **The actual thrower is `fetchExternalImage` (`image-optimizer.js:916`) — Next 16's SSRF guard.**
  `xggomcitqrkaylqezjjz.supabase.co` resolves to two **NAT64** addresses (`64:ff9b::/96`) alongside
  its two public Cloudflare IPs, and the guard aborts if **any** resolved address is private. The
  dev server logs it verbatim: `resolved to private ip [64:ff9b::…]`.
- 🟡 **Scope — read this before acting on it.** NAT64 is a property of **this machine's DNS64
  resolver**, not of the app, the bucket or the URL. So: **it reproduces in local dev, and
  production behaviour is UNVERIFIED.** Vercel's resolver may return only the public A/AAAA records,
  in which case prod is unaffected. Nobody has checked. Do not assert either way — and in
  particular, do not "fix" prod for a defect that may only exist on one laptop.
- **Only ONE surface is immune, and only by side-stepping the optimizer entirely.** `ImageUploadGrid`
  now renders the `blob:` URL the browser already holds (commit `d7a94be`) — 96px thumbs of a local
  file, so the round trip was the wrong shape regardless. That fix does **not** generalise: every
  surface below renders an image the browser has never seen.
- **Surfaces still on the unfixed path** (all render remote Supabase URLs through `next/image`):
  - `/produits/[id]` — **D1's gallery**, images from `src/lib/marche/product-detail.ts`
  - `ProductListingCard` — via `ListingResults` (marketplace browse + **`/recherche` results**,
    fed by `src/lib/search/search-marketplace.ts`) and `ConsumerHomepage`
  - `ui/avatar.tsx` — **inferred, not observed.** Its `src` is a remote URL on the *same* Supabase
    hostname, so it resolves the same way and meets the same guard. Listed because the guard keys on
    the host, not the bucket; nobody has watched an avatar go blank.
- ✅ **CONFIRMED on `ProductListingCard`, 2026-08-07 — the prediction above was right.** The first
  real seller-created product (`Baskets Nike Air Force 1 Low en cuir`, `8eff9603-4cb1-4050-ae0e-96fe50f297e0`)
  went through G6 with five images; its cover (`display_order = 0`) then failed to optimize on `/`,
  twice, on a clean `.next` at `2b65288`. Verbatim, both occurrences identical but for resolver
  ordering:
  ```
  ⨯ upstream image https://xggomcitqrkaylqezjjz.supabase.co/storage/v1/object/public/
    product-images/f4757d2d-705c-48c8-bd58-37a35c7bdab3/8eff9603-4cb1-4050-ae0e-96fe50f297e0/
    0c0c541e-a750-4a29-81cb-995e5b7d3578.webp
    resolved to private ip ["64:ff9b::6812:260a","64:ff9b::ac40:95f6"]
  ```
  Note what this does **not** change: the DB row and the storage object are both intact and correct
  (5 `product_images` rows, 5 objects under one `shopId/productId/` prefix). The defect is the
  optimizer round-trip alone. And note what it still does **not** establish — this is the same
  laptop's DNS64 resolver as before, so **production remains UNVERIFIED**; the second resolver
  ordering across two otherwise identical requests is DNS round-robin, not new evidence about prod.
  Carried forward untouched: do not "fix" prod for it, and do not re-audit `remotePatterns`.
- **If you hit a blank image, this is the first thing to check** — before the bucket, before the
  policies, before the URL. Confirm with the dev-server log line above, or by opening the
  `/_next/image?url=…` URL directly (400) next to the raw Supabase URL (200).
- **Escape hatches, if it turns out to need fixing:** `unoptimized` on the specific `<Image>`
  (currently used **nowhere** in `src`), or a plain `<img>` — both trade away the optimizer, which
  is why neither was applied blind here.
- **Trigger:** whenever a blank image is reported on any surface above, **or** before the next PR
  that ships a new remote-image surface. First step is cheap and unblocks the rest: check whether a
  deployed preview reproduces it, which converts "UNVERIFIED" into a real scope.

## 🟡 The G6 cover ribbon is measured in FR only — AR/RTL is UNTESTED, not passing

- The cover ribbon on the first upload tile (`ImageUploadGrid.tsx`) was moved to the bottom of the
  tile and verified by hit-test at **1440, FR only**: `elementFromPoint` at the text tail returns the
  ribbon, the remove button stays hittable, `scrollWidth == clientWidth` (no clipping).
- **AR was not measured, and is not claimed either way.** `scripts/gate/authed.mjs` cannot set the
  language cookie — its own follow-up, logged above at "🟡 `scripts/gate/authed.mjs` cannot set the
  language cookie" — so the AR half of every gate on this surface is unreachable through it.
- What is *reasoned* but **unverified**: the ribbon is `inset-x-0 bottom-0` (symmetric, so mirroring
  cannot move it) and the remove button is `end-2 top-2` (mirrors to the start side). They now sit on
  different rows of the tile — ribbon 74.5→95, button 9→37 of 96 — so the occlusion that motivated
  the move should be absent in both directions. `الغلاف` measures 23.55px against an 82px content
  box, so clipping is implausible. **None of that is a measurement.**
- **Trigger:** whenever the gate learns to set the language cookie, or the next manual AR pass over
  the seller surfaces — whichever comes first. Measure, then delete this entry or convert it to a
  defect.

## 🔴 A poisoned `.next` presents as a PLAUSIBLE APPLICATION BUG — the tell is the line number

- **The protocol is already written** ("Build clobbers dev `.next`" — stop dev, or build elsewhere,
  and `rm -rf .next` after). **This entry is not the rule. It is the SYMPTOM**, because the rule did
  not help: nothing looked like a build problem.
- **What happened (2026-08-07).** `npm run build` ran with dev stopped — correct — and then
  `next dev` was started on top of the production `.next` that build had just written. Dev served a
  **stale client bundle against a fresh server**. Image uploads began failing with
  *"Une erreur est survenue. Veuillez réessayer."*, two tiles in the error state, `Publier` correctly
  disabled. Nothing reached storage. It read exactly like a regression in the PR that had just
  merged.
- ⚑ **THE DIAGNOSTIC — the line number belonged to NEW code while the behaviour belonged to OLD.**
  The dev log carried a real React error with a real source frame:
  ```
  Cannot update a component (`ProductForm`) while rendering a different component (`ImageUploadGrid`)
      at src/components/produits/ImageUploadGrid.tsx:149:10
    > 149 |       fd.append('image', file)
  ```
  `fd.append` **is not a setState call**, and the error it was reporting had been *fixed and merged*
  hours earlier. That mismatch — a current line number under a stale behaviour — is the signature.
  A stale bundle throws the OLD error and Next maps it onto the CURRENT file, so the frame looks
  authoritative and points at innocent code.
- **How it fooled the first read.** The failure had a plausible in-app story: the same PR had renamed
  a prop (`productId` → `initialProductId`), so a stale chunk reading the old name yields `undefined`
  → `fd.append('productId', undefined)` → the literal string `"undefined"` → the uuid parse fails →
  the generic error. Every symptom fits a real code path. **The application explanation was
  coherent, and still wrong.**
- **The check, in order.** Before debugging any post-build dev failure: (1) does a logged error's
  source frame point at a line that could not raise it? (2) does the error correspond to something
  already fixed? If either is yes — **`rm -rf .next` and restart before reading another line of
  application code.** Here that alone resolved it: uploads succeeded, and the React warning count
  went from 1 to **0** in the clean run.
- **Cost of not checking:** the failure was reported as a live defect, and the diagnosis started at
  the server action, which was blameless.
- **Trigger:** any unexplained dev failure whose first appearance follows a `npm run build`.
