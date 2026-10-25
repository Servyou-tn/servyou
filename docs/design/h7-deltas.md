# H7 « Modifier un service » — deltas and rulings

Route `/mes-services/[id]/modifier`. **No Figma frame exists for H7** (zero Figma reads this PR). It is the H6
wizard (`docs/design/h6-measurements.md`, `h6-pr2/3/4-deltas.md`) in edit mode, so nothing below is a measured
divergence: these are the decisions the missing frame left open. Numbering continues from H6 PR-4 (D35).
The Arabic is a draft: every new AR string is marked `REVIEW_AR_TRANSLATION`.

## Architect rulings (as briefed)

| # | Ruling | Where |
|---|---|---|
| R1 | Guard: `requireFreelancer` + owner check server-side; unknown, malformed or somebody else's id → one indistinguishable 404 | `page.tsx`, `getServiceForEdit` |
| R2 | A **draft** opens the create flow on this id (resume, autosave, step 5 « Publier mon service ») | `page.tsx` |
| R3 | **Active / paused**: edit mode — title « Modifier le service », all 5 steps prefilled, **no autosave**, explicit « Enregistrer les modifications » on the récap, status unchanged | `ServiceWizard` `mode="edit"` |
| R4 | The DB publish gate re-checks changed fields on non-draft rows; a refusal is surfaced like the H6 publish refusal (récap rows flagged, « Modifier » opens that step) | `updateServiceAction`, `gateRefusalFields` |
| R5 | Pause / activate / delete stay in H5; this page shows the current status pill in its header | `PageIntro`, `service-status.ts` |
| R6 | H5 kebab « Modifier » enabled → this route | `ServiceRow.tsx` |
| R7 | Save → toast, back to `/mes-services` | `ServiceWizard.onSaveEdit` |

## Decisions proposed here

| # | Decision | Why |
|---|---|---|
| **D36** | Edit mode opens on `resumeStep(form)`: the **récapitulatif** for a complete service, the first failing step for a legacy one. | One click from the récap reaches any field (D26); a legacy service is taken straight to what it lacks. |
| **D37** | **Leave guard**: footer caption « Modifications non enregistrées » while the form differs from what was loaded; `beforeunload`; a `window.confirm` on any in-app link click. | The codebase has **no** leave-confirm pattern (G7 / H3 only show a dirty caption), so this is the smallest one that covers the tab close and every link. `window.confirm` is what the admin buttons already use. **Not covered: the browser Back button** (App Router exposes no blocker). |
| **D38** | A service **hidden by the moderation** (`admin_hidden_at`) opens **read-only**: `ModerationBanner variant="service"` (the existing notice), a note, and the récap without « Modifier ». | The pattern exists (`ModerationBanner`, `owner.moderation_banner.service`), so no 404. `updateServiceAction` refuses it too: the DB lock only blocks a moderated row's *status* change, not field edits. |
| **D39** | Saving **validates the whole row** with `validateServiceInput` (status = the row's current one), stricter than the DB's changed-fields rule. A legacy service (the 21 that fail the G4 rules) must be completed before any edit saves. | An edit form that saves half of a legacy row would re-create the « incomplete service under an old id » the gate exists to stop. The récap says which rows. |
| **D40** | The write sends **neither `status` nor `revisions_count`**, and is scoped to (id, owner, status in active/hidden, `admin_hidden_at` null). | Saving can't publish, pause or unpause; the validator's default of 1 revision must not overwrite a legacy row's value. |
| **D41** | Délai (step 3): placeholder and helper now say « ex : 7 jours » (AR « مثال: 7 أيام »). | Bug 2: the free text invited « 7 jour ». The helper repeats it because a placeholder disappears once typing starts. |
| **D42** | « Enregistrer les modifications » takes its own row below `sm`. | At 375 px it overflowed beside « Précédent » (measured: 397 px page in a 375 px viewport). |

## Bug 1 — « Business plan… » saved as « usiness plan… » (listing 263c5565)

**Not reproduced.** The stored value is the full sentence minus its first character, so the loss happened when
the text was typed, not on the way to the database. Checked:

- `saveServiceDraftAction`, `publishServiceDraftAction` and `validateServiceInput` only `.trim()` the short
  description — nothing strips a leading character (read, and covered by the new action tests).
- jsdom, `userEvent.type` on step 2 of the create wizard: « Business plan complet » reaches the autosave intact.
- Real Chrome (CDP, real key events) on the edit page: four runs, typing with 0 / 0 / 30 / 120 ms between « Modifier »
  and the first key — always intact.
- Real Chrome, typing into the server-rendered title input **before React hydrated**: the character survived
  hydration (one clean run).

No fix was shipped for a cause nobody found. If it happens again, the useful facts are: browser + keyboard layout,
whether it was the first field of a freshly opened step, and whether the page had just been resumed.
The data was corrected through the H7 UI (the founder's fix).

## Not in this PR (logged)

- Mehdi's `delivery_time` is still « 7 jour » — not part of the brief; the new hint prevents the next one.
- Browser Back is not guarded (D37).
- The moderated read-only branch is covered by unit tests (query, action refusal, récap without « Modifier »)
  but was **not** exercised live: no moderated listing exists and making one needs an admin write.
