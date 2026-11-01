# Phone reveal rule — UI changes for Agent B (`fix/phone-reveal-rule`, 2026-11-01)

The database rule (get_contact_phone, migration « phone_reveal_rule ») changes what each page receives. Every page
below already handles a NULL phone (it hides the number / button), so nothing breaks — but the texts and buttons
need to say WHY. The rule: whoever reaches out shares their number; the other side's is revealed when they accept.

## 1. Buyer — pending order: the seller's number is now hidden
- **`/mes-commandes` list** (`src/app/mes-commandes/_components/OrdersList.tsx`, `WhatsAppButton` → get_contact_phone
  on click): on a pending order the click now finds no number. Replace the « Contacter sur WhatsApp » button on
  pending orders with a hint « Disponible après acceptation par le vendeur » (FR / AR).
- **`/mes-commandes/[id]`** (`_components/OrderPanels.tsx` — the « Téléphone » row via `src/lib/marche/order-detail.ts`
  and the `WhatsAppContactButton`): same — hint instead of the button while pending; the « Téléphone » row already
  drops on NULL.
- After a cancellation while pending: no number either (same hint, or nothing — B's call with the founder).

## 2. Seller — no change
- **`/commandes-recues/[id]`** and G8's row (`WhatsAppContactButton`, `src/lib/marche/seller-order-detail.ts`): the buyer's
  number stays visible from « pending » (the WhatsApp confirmation before accepting). Only after a cancellation while
  pending is it gone — the existing NULL handling covers it.

## 3. Freelancer — missions: the client's WhatsApp is gone
- **`/missions/[id]/proposition-envoyee`** (H13, `src/app/missions/[id]/proposition-envoyee/page.tsx:79-85`): the
  `WhatsAppContactButton` to the client (keys `proposal.sent.whatsapp`, `…whatsapp_message`, `…whatsapp_error`,
  `…whatsapp_none`) will now ALWAYS land on « pas de numéro ». Remove it and reword the screen to « Le client vous
  contactera sur WhatsApp s'il retient votre proposition » (FR / AR).
- `/missions/[id]` and the proposal recap show the client through `src/components/missions/ClientCard.tsx`, which has
  no WhatsApp button — only its comment (« contact … once a proposal exists ») is now wrong; update it.
- **`/mes-engagements/[id]`** (freelancer's order detail): an ORDER follows the order rule (the freelancer is the
  seller → the buyer's number is visible from pending). No change.

## 4. Client (mission owner) — no change
- **`/mes-annonces/[id]`** (`src/lib/marche/annonce-detail.ts`): each responding freelancer's number stays visible.

## 5. Public freelancer profile D4
- **`/freelance/[id]`** (`_components/PrimaryCta.tsx`, `src/lib/marche/freelancer-detail.ts`): a buyer now gets the
  WhatsApp CTA only once their service order is ACCEPTED — on a pending request they see « Demander un service »
  again, which reads oddly. Suggest: on a pending request, the hint « Disponible après acceptation par le
  freelance ». A client whose mission received this freelancer's proposal still gets the WhatsApp CTA (unchanged).
  Its header comment (`PrimaryCta.tsx:8-14`, « returns a phone once a request exists ») is no longer true for a
  pending request — update it with the UI change.

## Note — the rule is per PAIR of accounts
get_contact_phone answers for two accounts, not for one order: once ANY order between them is past « pending », both
numbers are visible, even if a newer order between the same two is pending or was cancelled while pending.
