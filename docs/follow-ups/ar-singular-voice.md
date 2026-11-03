# Follow-ups — AR singular voice (`fix/ar-singular-voice`, 2026-11-03)

## The Arabic home page is 18 px wider than the screen at 375

**What** `/` in AR measures 378 px wide inside a 360 px client width at 375 (pre-existing: the #304 before / after captures are 378 wide
too). No other page touched here overflows.

**Why deferred** Not caused by this copy change; the landing has no 375 pass in this PR.

**Where it lives** `src/app/page.tsx` → `src/components/landing/*` (Hero / Categories are the likely sources).

**Trigger** The landing's mobile pass.
