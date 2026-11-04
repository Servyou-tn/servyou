# Mission budget with equal bounds prints « 800 – 800 TND » (`feat/m375-h8l-h11`, 2026-11-04)

**What** `budgetValue` (`src/app/tableau-de-bord/_components/MissionRow.tsx`) prints a range whenever both `budgetMin`
and `budgetMax` are set, so a mission saved with equal bounds reads « 800 – 800 TND » on the H4 dashboard.

**Why deferred** Founder ruling after #316: log it, not now (a display-logic change outside the 375 pass).

**Where it lives** `MissionRow.tsx` `budgetValue()`; the same range format may exist on the mission list/detail
(`formatJobBudget`) — check both together.

**Trigger** The next pass on missions / H4, or a mission saved with equal bounds in real data.
