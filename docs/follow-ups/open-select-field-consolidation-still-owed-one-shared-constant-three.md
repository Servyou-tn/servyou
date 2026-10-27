# Select-field consolidation still owed — one shared constant, three copies, no real component (PR-D, `feat/annonces-form-ds`, 2026-08-19)
- **What:** PR-D extracted `SELECT_FIELD_BASE` into `components/layout/styles.ts` (alongside
  `FOCUS_RING`/`CARD_SHADOW`) from E1's local `selectField` shape (`ProductRequestForm.tsx` —
  deliberately, not G6's: E1's version omits the border color so a caller can append
  `border-danger-500` on error, which PR-D's per-field error state needed and G6's own copy, baked
  to `border-border-strong` unconditionally, did not support). G6's `ProductForm.tsx` and the new
  `/mes-annonces/nouvelle` both now consume the shared constant. **E1's own `ProductRequestForm.tsx`
  still has its local copy, untouched** — task scope named only "here and G6," not the extraction's
  own source file, so there are now three call sites (G6, annonces, E1) and one shared definition
  E1 itself doesn't use yet.
- **Why deferred:** consolidating E1 onto the shared constant is a one-line, zero-risk change, but
  bundling it into a form-rebuild PR not otherwise touching E1 widens the diff for no behavioral
  reason. The bigger item — a real DS `Select` component (out of scope per PR-D's own brief: "DS
  Select" is explicitly listed as out of scope) — is the actual fix; the shared string constant is
  a stopgap three routes now depend on informally.
- **Trigger:** the DS pass that finally builds a real `Select` primitive (Section 4's locked
  component list already names it), or a small consolidation commit that points E1 at
  `SELECT_FIELD_BASE` too in the meantime.
