// The phone reveal rule (db/migrations « phone_reveal_rule », founder + architect, 2026-11-01): whoever reaches out shares their number; the other side's is
// revealed when they accept. What the UI does with it, in one place:
//   BUYER → seller / freelancer: the number exists only from « accepted » on (and after a cancellation that happened AFTER acceptance). While the order is
//   « pending » the buyer sees the hint « Disponible après acceptation… » instead of a button that could only fail; a cancelled order shows nothing (the database
//   hides the number for an order cancelled while pending, and a cancelled order has no one left to contact — the per-order « cancelled after acceptance »
//   case needs the events table, so it is not guessed here).
//   SELLER → buyer: from « pending » on — no change. MISSION OWNER → freelancer: no change. FREELANCER → client through a mission: never (the button is gone).
// Pure — the pages decide from the order's status, never from a lookup that could race the click.

export type BuyerContact = 'button' | 'hint' | 'hidden'

export function buyerContactState(status: string): BuyerContact {
  if (status === 'pending') return 'hint'
  if (status === 'cancelled') return 'hidden'
  return 'button'
}
