# Orders + job posts caps — logged, not fixed (`feat/orders-jobposts-caps`, 2026-10-29)

Ranked.

## 1. LOW — the order stock refusal is not explained to the buyer
**What:** `enforce_order_insert_integrity` raises 23514 hint `stock` when the quantity exceeds stock, but
`demander/[id]/actions.ts` answers it with the generic error. The action's own pre-check (`demander.error.stock`)
only catches it when the read is fresh, so a concurrent sale answers « Une erreur est survenue ». `orderCapKey`
deliberately leaves `stock` unmapped (one PR, one focus).
**Trigger:** next demander touch — map hint `stock` to `demander.error.stock` next to the caps.

## 2. INFO — the cap numbers live in three places
**What:** 5 / 20 (orders) and 5 / 10 (job posts) are in the two trigger functions, their French DB messages and the
FR + AR i18n keys (`demander.error.cap_*`, `annonce.error.cap_*`). Change them together.

## 3. INFO — the client never pre-checks the caps
**What:** the forms submit and the database refuses, so a buyer at 5 pending orders finds out only on submit. A
« 5 / 5 » hint on the order form or on « Publier une annonce » would need a count read. Product call, not security.
