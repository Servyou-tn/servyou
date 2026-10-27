# `orders.carrier` is seller-writable in the schema with NO surface that can write it

- **What:** migration `20260729111938` grants `UPDATE (carrier, tracking_number)` to
  `authenticated`, and `enforce_order_identity_lock` narrows both to the seller. But **G9's
  panel-suivi renders the carrier READ-ONLY**, because Figma `497:26411` draws "Société de livraison"
  as static text in an `lv` block and gives an `Input` only to the tracking number. So the column is
  writable and nothing writes it — it renders an em-dash on every order.
- **Why it shipped that way (founder call, and Figma agrees):** the alternative was an input with no
  source of truth. A per-order carrier free-text box invites seven spellings of "First Delivery" and
  makes a later rate table or bordereau unjoinable. Shipping a dead input is the exact defect the
  panel was originally withheld to avoid.
- **Where it should come from:** `shops.preferred_carriers` (text, nullable) is a shop-level default.
  **CORRECTED (`feat/g3-shop-edit`, 2026-08-15): no longer unused** — it became writable in PR #129
  (`/ma-boutique/creer/configuration`'s "Livraison" accordion), and G3 now links a returning owner
  straight to that page. **What is still open:** neither #129 nor G3 makes G9's order form READ
  `preferred_carriers` — the shop owner can set their carriers, but no order defaults from it yet.
  The gap this entry describes (G9's carrier field has no source of truth) is unchanged; only the
  "unused column" half of the diagnosis is resolved.
- **Decide before building:** `preferred_carriers` is a free-text column today. If carriers become a
  selectable set it wants either a CHECK'd enum or a small lookup table — the discovery report
  explicitly deferred a `carriers` table as a Phase 3 question. Do not add the G9 Select before that
  is answered, or the two will disagree.
- **Trigger:** the delivery-documents PR, or the next G9 pass — the bordereau needs a carrier per
  order, so it forces the question. (The G3 shop-edit build, previously named as a trigger here, has
  now landed and did not close this — see the correction above.)
