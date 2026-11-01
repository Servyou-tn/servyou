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
- **`/missions/[id]`** and the proposal recap **`/missions/[id]/proposer`** (`src/components/missions/ClientCard.tsx`,
  `src/lib/marche/proposals.ts`): a sent proposal no longer reveals the client's number. Remove the client WhatsApp
  button from the freelancer side, and reword anything promising contact (e.g. H13 « Proposition envoyée » WhatsApp
  CTA) to « Le client vous contactera sur WhatsApp s'il retient votre proposition ».
- **`/mes-engagements/[id]`** (freelancer's order detail): an ORDER follows the order rule (the freelancer is the
  seller → the buyer's number is visible from pending). No change.

## 4. Client (mission owner) — no change
- **`/mes-annonces/[id]`** (`src/lib/marche/annonce-detail.ts`): each responding freelancer's number stays visible.

## 5. Public freelancer profile D4
- **`/freelance/[id]`** (`_components/PrimaryCta.tsx`, `src/lib/marche/freelancer-detail.ts`): a buyer now gets the
  WhatsApp CTA only once their service order is ACCEPTED — on a pending request they see « Demander un service »
  again, which reads oddly. Suggest: on a pending request, the hint « Disponible après acceptation par le
  freelance ». A client whose mission received this freelancer's proposal still gets the WhatsApp CTA (unchanged).
