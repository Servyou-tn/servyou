# Fix the four raw-color values + gate lint locally (`chore/lint-raw-colors`, 2026-08-25)

## `shared-ui/no-raw-color` only covers `src/components/ui/**` — raw bracket values already live outside that boundary, uncaught by design

- **What:** this PR fixed the rule's 5 known violations (`setting-row.tsx` ×3, `tag-input.tsx` ×2 —
  see the PR body for the value-by-value breakdown). While checking whether four other components
  shipped in the same window also failed lint (AnnonceCard, AnnonceDetail, ConfirmModal,
  ParametresShell), the honest answer turned out to be a scope finding, not a clean bill of health:
  `eslint.config.mjs` only applies `shared-ui/no-raw-color` to `files: ["src/components/ui/**/*.{ts,tsx}"]`.
  All four components live in `src/components/marche/` or `src/components/parametres/` — outside the
  glob — so none of them can fail this rule regardless of what they contain. Two of the four contain
  exactly the pattern the rule exists to catch: `AnnonceCard.tsx:182` has `rounded-[10px]`, and
  `ParametresShell.tsx:161,178` has `max-w-[720px]` (×2) — both already flagged as off-token in their
  own code comments (`rounded-[10px]`'s comment calls it "the same already-logged off-token CTA
  radius"; `max-w-[720px]`'s calls it "the same cap ... numbers the rail/content split above already
  uses"), i.e. known, not accidental, and still invisible to `npm run lint` either way.
- **Why this matters beyond these two files:** the rule's boundary was drawn at the shared/UI-
  primitives layer (F2's "primitives stay token-only" boundary,
  `eslint-rules/boundary.mjs`'s header comment), which is a reasonable place to enforce strictly
  first — but it means every raw arbitrary value in feature code (`src/components/marche/`,
  `src/components/parametres/`, `src/app/**`, etc.) is currently unenforceable by lint at all, not
  just unenforced-until-now the way `setting-row.tsx`/`tag-input.tsx` were. A grep for the same
  bracket-numeric pattern this rule matches turns up hits beyond just these two files; no full count
  was taken here — that's exactly the sweep this needs, not something to estimate from two examples.
- **Not fixed here — deliberately:** widening `shared-ui/no-raw-color`'s `files` glob (or adding a
  second, feature-scoped rule) is its own PR. It needs a repo-wide sweep first to know how many files
  it would newly flag and whether any are false positives (an intentional 1px hairline, a value that
  genuinely has no token equivalent) before the rule goes live — the exact caution this PR itself
  followed for `w-[122px]`/`size-[18px]` (checked for a token match before touching either, didn't
  invent one). Widening the glob without that sweep first would just repeat the #150→#158 pattern:
  a rule going red with nobody positioned to act on the count.
- **Trigger:** a dedicated PR to (1) sweep `src/components/marche/`, `src/components/parametres/`,
  and `src/app/**` for the same bracket pattern, (2) triage which hits are genuine token gaps vs.
  fixable, (3) widen the `shared-ui/no-raw-color` `files` glob (or introduce a parallel rule) to
  cover what the sweep confirms is safe to enforce.
