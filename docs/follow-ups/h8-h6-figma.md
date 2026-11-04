# Follow-ups — H8 detail + H6 at 375 (`feat/h8-h6-figma`, 2026-11-03)

## Arabic « Historique » times read backwards (« 1809:12 07/ » for « 18/07 09h12 »)

✅ CLOSED — #308 (agent A, 2026-11-03).

**What** In AR, each `OrderTimeline` entry prints « · 18/07 09h12 » as one span inside an RTL line, so the bidi algorithm
reorders the digit runs. Seen on `/mes-engagements/[id]` at 1440 and 375; every caller of the timeline is affected.

**Why deferred** Pre-existing, and `OrderTimeline` is a shared component (E4, G9, H8), so it needs its own change.

**Where it lives** `src/components/orders/OrderTimeline.tsx` (the `shortDateTime` span). The usual fix is to isolate the time
as one LTR run (`<bdi dir="ltr">` or LRI … PDI), as for the order refs.

**Trigger** The next AR packet, or any PR that touches `OrderTimeline`.
