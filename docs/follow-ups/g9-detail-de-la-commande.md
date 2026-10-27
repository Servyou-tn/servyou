# G9 — Détail de la commande (`feat/g9-order-detail`, 2026-07-28)

## Two G9 panels are omitted until the schema PR — deliberately blank, not placeheld
- **`panel-suivi` (497:26411)** — "Société de livraison" + a tracking-number **Input**. No carrier
  column, no tracking column, so the field would be a dead input.
- **`panel-historique` (504:27042)** — a timeline of EVENTS ("Confirmée sur WhatsApp", "Bon de
  livraison imprimé"). None is derivable: `orders` has no per-step timestamps and nothing records a
  WhatsApp confirmation or a print.
- **Founder call:** omit both entirely rather than render deferred placeholders. *An empty "Suivi"
  panel with a dead input teaches a seller the feature is broken; absence teaches nothing false.*
  **Exception shipped:** the cancellation entry IS rendered — `cancelled_by`,
  `cancellation_reason` and `cancelled_at` all exist, and one real entry beats a panel of nothing.
- Same reasoning drops the price breakdown's **Livraison** and **Total** rows: no `delivery_fee`,
  and a total silently equal to the subtotal is a wrong number on a COD invoice.
- **Trigger:** the schema PR (`delivery_fee` · carrier · tracking · print stamp · `order_events`),
  which is the same one the delivery documents wait on.

## WhatsApp prefill is capped to the ARABIC budget, and the cap is tested
- `WHATSAPP_MESSAGE_MAX = 300` characters, asserted in `src/__tests__/whatsapp-prefill.test.ts`
  against the shipped FR **and** AR templates with deliberately long values.
- **Why 300 and not 2000:** percent-encoding is per UTF-8 byte. A Latin letter costs 1 URL char;
  `é` and every Arabic character cost 6. Measured: 125 French chars → 187 encoded (×1.5); 100
  Arabic chars → 412 (×4.1). wa.me publishes no text limit, so the ceiling is the URL, and ~2000
  is the safe cross-browser figure — which is ~300 Arabic characters, not 2000.
- **A template written to the French budget overflows only in Arabic**, which is precisely the
  defect that ships. Any new prefill template must be added to that test.
- Latin tokens sit inside « » at the END of the Arabic string so the order reference never lands
  mid-RTL — the pattern E3's existing message already uses. Also asserted.
- `orders.whatsapp_order_message` (dead, zero importers) was **deleted** rather than left.

## The WhatsApp button contacts; it does not advance the order
- G8 first shipped `pending`'s wa/brand button as a **skin on the accept transition**. G9's frame
  settles it: the `pending` specimen puts a WhatsApp Button under "Prochaine étape" with the
  helper *"Confirmez la commande avec le client sur WhatsApp **avant** de préparer le colis"*.
- **On COD you confirm before you accept**, and conflating them means a seller accepts an order
  they have never discussed. Both surfaces now render two controls: WhatsApp (contact) and a
  separate "Accepter" (transition). G8's row was corrected in the same PR.
- Row width was measured before the change: the pending cluster was 490 of 1121; a third control
  adds ~104, landing at ~594 with mid at ~480. It fits, but 53% of the row becomes controls, so
  the row uses the SHORT label ("WhatsApp") while G9's rail button carries the full sentence.
