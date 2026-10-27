# `OrderRail` overflows its container at 375 (pre-existing, and it bounds the desktop fix)

- **What:** the rail's nodes are `shrink-0`, so they cannot compress. At a 375 viewport the rail's
  container measures **278** while 7 product nodes at `w-14` sum to **392** — a **114px** overflow.
  Measured, not inferred. **This is G9-specific: the 4-stage E3 buyer rail fits** — measured 224 in a
  296 container at 375 (−72 slack), and 320 in 1081 at 1440 (−761). So the defect is the 7-step
  PRODUCT chain, not the shared component.
- **Why it is logged rather than fixed:** it is **pre-existing** (`w-14` is unchanged from the G9
  delta pass) and it is what forced the desktop node widening to be **lg-only**: `w-20` unconditional
  would have taken the mobile overflow from 114 to **282**, i.e. made a real defect 2.5× worse in
  order to close a cosmetic one. So below-lg geometry was left byte-identical to what shipped.
- **The honest fix is a design decision, not a value:** a 7-step rail does not fit 375 at any
  legible node width (7 × 44 minimum touch-ish column = 308 > 278). It needs either a horizontally
  scrollable rail, a vertical rail below lg, or a condensed "step 4 of 7" representation. **There is
  no mobile frame for G9** — nor for any of the ten seller pages — so this cannot be measured, only
  designed.
- **Trigger:** whenever G9/E3 get a mobile frame. Fold in the separate 375 shell overflow already
  logged (the topbar right cluster) — at 375 this page currently reports a **73px** document
  overflow in total, and the two causes should be separated by measurement, not guessed at.
