# HEIC uploads are rejected, not converted — client-side conversion is the real fix

- **What:** the avatar upload action rejects HEIC/HEIF with an explicit FR/AR message pointing the
  user at the iOS setting. It does **not** convert.
- **Why this matters more than it sounds:** **HEIC is what an iPhone shoots by default**, against a
  documented 70%+ mobile-first Tunisian market. So this is not an edge case — it is a meaningful
  share of real uploads hitting a rejection.
- **Why rejected rather than converted:** `sharp`'s prebuilt binaries generally lack HEIF decode,
  so the decode fails inside the very step that is the content gate. A silent failure there would
  be worse than an explicit refusal.
- **Why the message is specific rather than generic:** a bare "format non supporté" on the format
  an iPhone shoots by default reads as the app being broken. The shipped message names the fix:
  *« Réglages > Appareil photo > Formats > Plus compatible »*.
- **The real fix:** convert client-side before upload (a browser-side HEIC decoder produces a
  JPEG/WebP the server can then normalize), so the user never sees a rejection. Costs a client
  bundle addition, which is why it is not in this PR.
- **Trigger:** first real report of an iPhone user blocked, or the next avatar/upload UX pass —
  whichever comes first. Worth measuring the rejection rate before spending the bundle.
