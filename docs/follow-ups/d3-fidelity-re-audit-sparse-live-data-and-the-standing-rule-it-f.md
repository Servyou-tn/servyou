# D3 fidelity re-audit — sparse live data, and the standing rule it forces (`fix/d3`, 2026-08-13)

## Founder audit: were the shop_type/delivery_setup meta bits and PAIEMENT/CATEGORIES chip rows built, or never built?
- **Question:** OM shop (the only live shop) renders name, city, "Boutique depuis juin 2026",
  description, and the actions row — no shop-type bit, no delivery-setup bit, no chip sections.
  Same question the GATE-DESIGN PRINCIPLE entry above already asks in a different shape: does the
  live page's silence mean the region is absent, or that it was built and is correctly hidden?
- **Answer, read from `ShopDetail.tsx` directly, not inferred from the live render:** built and
  correctly hidden, all four. `const hasMeta = Boolean(shop.shopType || shop.deliverySetup)`
  gates the shop-type/delivery-setup pair (`{hasMeta && (...)}`, each bit additionally
  individually gated inside); `{(shop.paymentMethods.length > 0 || shop.categories.length > 0) &&
  (...)}` gates the chips block, with PAIEMENT and CATEGORIES each independently gated inside
  that by their own `.length > 0`. OM shop has `shop_type`/`delivery_setup` both null and zero
  rows in both join tables (confirmed live in `d3-discovery.md` §3) — every one of these
  conditions is false for the only shop anyone can look at, which is why an unbuilt region and a
  correctly-hidden one were indistinguishable on sight. No code defect found; no code change made.

## 🔴 STANDING RULE: exercise every conditional region with data that makes it render, before calling a page verified
- **Extends the GATE-DESIGN PRINCIPLE entry above** (this file, under "G8 — Commandes reçues"):
  that entry's third bullet already covers *interactive* default-state blindness ("measuring a
  control in its default state is not evidence about its other states — open the panel, expand
  the row"). This is the same blindness in *data* form: a nullable/optional field that happens to
  be null on the one live row and a region that was never built produce the identical rendered
  output. Checking a page against whatever the live database currently holds cannot tell the two
  apart — it isn't a gate on that dimension, it's a formality, per the principle above.
- **Required step, from now on:** before declaring any page verified, seed a temporary fixture
  that populates every optional field the frame draws, screenshot the page in that state, then
  tear the fixture down. The populated-state screenshot — not the sparse-data one — is what gets
  compared against the Figma frame.
- **Trigger:** before declaring any page verified whose Figma frame draws a region backed by a
  nullable column, an optional join table, or any other field that can legitimately be empty.
