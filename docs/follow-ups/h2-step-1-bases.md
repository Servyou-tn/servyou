# H2 step 1 "Bases" (`feat/h2-step1-bases`, 2026-08-14)

## ✅ `Stepper` is now at its documented third consumer — promote to shared — RESOLVED in H6 PR-2

- **Resolved 2026-10-23 (`feat/h6-wizard-steps-1-2`):** promoted to `src/components/ui/stepper.tsx` with H6's
  measured look for all three wizards (founder ruling D2); the column-width question is a `layout` prop
  (`compact` = G2/H2's 80/40, `stretch` = H6's 100/flex-1). Both route-local copies deleted. History below.

- G2's `Stepper.tsx` (`ma-boutique/creer/_components/Stepper.tsx:4-8`) explicitly names "promote
  at third consumer" as the rule for when its route-local wizard-stepper component should move
  to a shared location. H2 step 1's own 3-step stepper (`mon-profil-freelance/creer/_components/
  Stepper.tsx`) is that third consumer — same circle/connector/label shape, same component API
  shape (`{ label, state }[]`), copied rather than imported.
- **Not promoted here.** Promoting means editing G2's two existing consumers
  (`ma-boutique/creer/_components/CreateShopForm.tsx` and `configuration/_components/
  ConfigurationForm.tsx`) to repoint their imports at a new shared location — a cross-cutting
  change to G2's already-shipped files from inside an H2 PR, which "one PR, one focus" pushes
  back on.
- **Also unresolved if promoted:** the two existing copies disagree on column width (G2: 80px /
  `w-20`; H2's own frame measured 100px / `w-100`, built at 80px instead —
  `docs/design/h2-discovery.md §8`). A shared component would need to either parametrize the
  column width or pick one value platform-wide; not decided here.
- **Trigger:** whenever H2 step 2 or 3 needs their own stepper instance (a 4th consumer would
  make deferring the promotion harder to justify), or a dedicated component-consolidation pass.
