# H7 Modifier un service: collapsible-sections edit page (`feat/m375-h3`, 2026-11-05)

**What** The m375-h7-service-modifier frame draws the service edit page differently from the 5-step wizard it uses now
(`ServiceWizard mode="edit"`). It shows:
- collapsible sections: « Métier & description », « Tarif & délai », « Prestation » and « Statut & visibilité »;
- a « Complété » pill on each section;
- a « Voir le service » link.

**Why deferred** Founder ruling after #324: H7 stays the aligned 5-step wizard, and the redesign waits until after the beta.
It means rebuilding the shared wizard's edit mode, which is outside a 375 pass.

**Where it lives** `src/app/mes-services/[id]/modifier/page.tsx` and the `ServiceWizard` it renders. The frame export is
`docs/design/m375-h7-service-modifier.png` and `-dump.json`; the questions are in `docs/design/h7-h1-375-deltas.md`.

**Trigger** The post-beta design pass on the freelancer workspace.
