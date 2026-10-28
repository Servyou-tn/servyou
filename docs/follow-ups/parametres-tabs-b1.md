# Paramètres tabs PR-B1 — logged, not fixed (feat/parametres-tabs)

Found while building Comptes connectés + the save toast; ranked.

**Founder rulings on PR #223:** 1 fixed in commit 3 (footer `lg:` offset + wrapping button group) · 5 keep the type tokens · 7 fade only icon + name, badge at full contrast (commit 3) · 8 keep 356px, no global `<Toaster>` change. Items 2, 3, 4, 6, 9, 10 remain open.

1. **FIXED (commit 3) — the Paramètres footer overflows the viewport at 375px** (`ParametresShell.tsx`, footer wrapper
   `ps-[calc(240px_+_32px)]`). The 272px start padding is the desktop rail offset but applies at EVERY width, so under
   `lg` the caption wraps and « Annuler / Enregistrer » run past the right edge (seen in FR and AR 375 captures).
   Pre-existing from the shell PR (#156). Fixed in commit 3 at the founder's request: `lg:ps-[…]`, and the button group now
   `flex-wrap` (in FR the two buttons alone were wider than a 375 row, so the offset fix was not enough).
2. **INFO — 424:17442 is the Notifications tab, not a separate state.** It is the « E-mails » panel (5 `Setting Row`
   toggles incl. the locked « Alertes de sécurité », 3 on / 2 off defaults) + the muted « Notifications sur la plateforme
   — Bientôt disponible » panel + the clean footer. Left as the placeholder per the brief; it is PR-B5's frame. The clean
   footer in it was the only part that applied now (green check, fixed here).
3. **LOW — the success toast fires only from the language save**, the one real save on the page. PR-B5's notification saves
   (and any future tab) should call `showSuccessToast` from `components/ui/success-toast.tsx` after a successful action.
4. **LOW — the toast's progress bar does not pause on hover**, while sonner's own timer does. The bar can finish before the
   toast leaves if the pointer rests on it. Fix needs sonner's pause state (not exposed to custom toasts in 2.0.7) or a
   `pointerenter/leave` handler that freezes the transform.
5. **RULED: keep the type tokens — Figma heights run ~23px shorter than the build on Comptes connectés** (panel 589 vs 612): the frame uses
   ≈1.2 line-height ("auto") where the type tokens are 1.5 (title 24 vs 28, body 2 lines 38 vs 48, rows 61 vs 63). Kept the
   tokens; a 1.2 body line-height would fail the readability norm the rest of the app follows.
6. **INFO — `PlaceholderTab` now serves only Notifications** and goes away with PR-B5.
7. **RULED + FIXED (commit 3) — the « Bientôt » badge text is ~2.2:1 at the frame's 0.5 opacity** (WCAG 1.4.3 wants 4.5:1).
   Built as drawn (the whole row at 0.5, pixel-measured). The rows are informational, not disabled controls, so the
   disabled-control exemption does not clearly apply. Safer variant: opacity on the icon + provider name only, badge at full
   `text-secondary`. One-line change in `ComptesConnectesTab.tsx` once ruled.
8. **RULED: keep 356px, no global change — the toast is 356px, the frame's 380px.** A per-toast width override renders ~12px off-centre (sonner only offsets
   left/right toasts), so it uses the root `<Toaster>` width. Matching 380 = `<Toaster style={{ '--width': '380px' }}>` in
   `layout.tsx`, which widens EVERY toast — a global call, not made here.
9. **LOW — « Enregistrer » on a clean form still re-saves and toasts « enregistrées »** (both buttons stay enabled in the
   clean state, per the frame). True but a no-op write; guard with `isDirty` if the founder prefers.
10. **INFO — the toast bar can restart/finish out of step with sonner's timer** (remount on re-stack, hidden tab). Decorative
    (`aria-hidden`); folded into item 4's fix.

