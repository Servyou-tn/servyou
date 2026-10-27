# `Input`/`Textarea`'s `required` prop couples the visual asterisk to `aria-required` — blocks the HYBRID no-asterisk rule on a majority-required form (PR-D, `feat/annonces-form-ds`, 2026-08-19)
- **What:** `/mes-annonces/nouvelle` is a majority-required form, so the locked HYBRID field-marking
  rule applies: required fields carry NO visual asterisk (optional fields carry "(optionnel)" in
  the label text instead, already true of every optional label in this form). Category and Ville
  are native `<select>`s, so PR-D wired `aria-required="true"` on them by hand with no asterisk —
  clean. **Title (`Input`) and Description (`Textarea`) could not follow the same rule.** Both
  primitives expose exactly one `required: boolean` prop that does two things at once
  (`components/ui/input.tsx:83` / `components/ui/textarea.tsx`, same shape): it renders the
  visual asterisk AND sets `aria-required`. There is no way to ask for one without the other.
- **Confirmed structurally impossible to route around from the caller side, not just inconvenient:**
  both primitives spread `{...props}` onto the native element and THEN set
  `aria-required={required || undefined}` as an explicit JSX attribute afterward — in React, an
  explicit attribute declared after a spread always wins, including when its value is `undefined`,
  which removes the attribute. So passing `aria-required="true"` through the props spread while
  leaving `required` unset does not survive; it gets silently overwritten to `undefined`. There is
  no prop combination that yields "aria-required, no asterisk" without editing the primitive.
- **What PR-D shipped instead, and why it's a report rather than a fix:** Title and Description
  ship with NEITHER the asterisk NOR `aria-required` under this interim — not a regression (the
  form they replace had neither either — no `required` handling existed anywhere in the old
  hand-rolled version), just not yet the full HYBRID rule. Editing `Input`/`Textarea` to add a new
  prop was deliberately not done unilaterally inside a form-rebuild PR: it is a shared-primitive
  contract change touching every one of their existing call sites (G6, E1, H2, H3, G2's
  configuration step, …), which is a decision for a DS pass, not a side effect of this one.
- **The fix, when someone picks this up:** split the concern into two props — e.g. keep `required`
  for the common case (asterisk + aria-required together, today's behavior, no call site needs to
  change) and add `hideRequiredMarker?: boolean` (or equivalently `ariaRequired?: boolean`
  independent of the visual `required`) for a caller that wants aria-required without the
  asterisk. Additive, so every existing call site is unaffected.
- **Trigger:** the next DS pass on `Input`/`Textarea`, or the next majority-required form built
  after this one that hits the identical wall.
