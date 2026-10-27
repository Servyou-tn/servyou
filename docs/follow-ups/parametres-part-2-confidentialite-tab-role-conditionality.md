# Paramètres part 2 — Confidentialité tab + role conditionality (`feat/parametres-tabs`, 2026-08-24)

## Adjacent Latin proper nouns in Arabic copy visually reorder under RTL — a new bidi class beside the numeric-run one

- **What:** new AR copy for the Confidentialité "Visibilité" section originally read `"...محركات
  البحث مثل Google وBing بفهرسة..."` — two short Latin brand names, each its own LTR run, separated
  only by the bidi-neutral prefix conjunction "و". The DOM `textContent` was correct Arabic; the
  **rendered screenshot** showed the two runs visually reorder into `"...مثل Bingg Google..."` — a
  garbled collision, not a translation error. Caught only because the row was screenshotted during
  verification; a DOM read or unit test would have reported the string as fine.
- **Why this is a distinct class from [[reference_rtl_numeric_run_reversal]] / the `tndPrice` entry
  above:** those are digit-run (EN) + Latin-letter-run (L) reversals under UAX#9 rules W7/N1/N2 — one
  number, one unit/currency token. This is **two separate strong-LTR (L) runs**, both proper nouns,
  with no digits involved — same family of bug (UAX#9 bidi reordering of embedded LTR content inside
  an RTL paragraph), different trigger condition (adjacency of two L runs, not an EN+L pair). Anyone
  pattern-matching "we already handle the digit case with `dir=\"ltr\"`" would miss this one — it
  isn't a number, so the existing numeric-run mitigations don't apply, and there's no single `dir`
  wrapper to reach for since both tokens sit inside one plain-string `t()` call (no sub-span to
  isolate without restructuring the row to accept rich content).
- **Fix applied (this PR):** reworded the two AR strings to drop the explicit engine names entirely
  (`"يسمح لمحركات البحث بفهرسة..."`) rather than fight the bidi algorithm — the brand names weren't
  essential information and isolation markup isn't reachable through a plain `t()` string.
- **Trigger / standing rule going forward:** **any new Arabic copy that names two or more Latin-
  script proper nouns (brand names, product names, acronyms) in the same sentence needs a real
  screenshot, not just a DOM/unit-test read, before it ships.** If isolation is ever needed instead
  of a reword (e.g. the names are unavoidable), the row will need to accept rich content so each
  Latin run can sit in its own `dir="ltr"`/`<bdi>` span — `t()` returning a plain string can't do
  that today.

## PR-3 (Notifications tab) — blocked on Figma monthly quota, prep notes for a clean start

- **What:** the Notifications tab's six `Setting Row` rows (E-mails panel: row 4 = "Alertes de
  sécurité" locked ON, rows 5–6 off, shop_owner variant drops "Missions correspondant à mes
  compétences" for "Alerte stock faible") were never built this PR. Session memory
  (`project_figma_i2_parametres`, `project_figma_aide_param_shop_support`) only ever recorded the
  **structure** — row count, which row is locked, which row differs by role — never the literal
  label/description text for rows 1, 2, 3, 5, 6. A repo-wide grep confirmed the copy isn't written
  down anywhere else either.
- **Why deferred:** the one `get_design_context` call this session's Figma quota allowed was spent
  measuring the Confidentialité base/shop_owner delta (`423:17277`, see the tab's own PR). A second
  call for the Notifications specimen (`424:17442`) hit `mcp_rate_limit_paywall` outright — the
  Starter-seat monthly cap was exhausted, not a transient failure (see
  [[reference_figma_mcp_monthly_quota]]'s 2026-08-24 entry: the session's entire remaining budget was
  exactly one call, not "plenty"). Per standing instruction, did not retry into the quota and did not
  guess the copy to fill the gap — `PlaceholderTab` stays wired for Notifications until this is
  unblocked.
- **Trigger / what to pull when quota resets:** primary target **`424:17442`** (the "état sauvegardé"
  Notifications specimen — has the full 6-row panel + section chrome). If that node is gone or
  insufficient, the same content also lives in the main I2 frame **`423:16615`**. The shop_owner
  variant's swap (drop "Missions...", add "Alerte stock faible") is **`558:38878`** — pull only if
  the base pull doesn't already carry enough to derive the swap from the structural delta memory
  already has recorded. One call should cover it (base rows only, deriving the shop delta from
  memory); budget a second only if the founder wants the shop_owner row's exact text verbatim rather
  than derived.
