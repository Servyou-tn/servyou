# English skill labels — follow-ups (`feat/i18n-en-skills`, 2026-11-11)

## Job-post skill suggestions are French in the English form
**What:** when a client posts a job (`AnnonceForm`), the suggested skills are listed by their French label in English too, because the chosen text is what gets saved.
**Why deferred:** job posts store skills as French text on purpose, so a post and a freelancer profile compare the same text. Showing English in the picker while saving French needs a value/label split in the combo box.
**Where it lives:** `src/components/marche/AnnonceForm.tsx` (`skillSections`), the combo box component.
**Trigger:** when job posts store skill ids instead of text, or when English users report it.

## Stored skill text in Arabic
**What:** job-post skills, stored as French text, are shown as stored in Arabic. English now resolves them through `skillTextLabel`.
**Why deferred:** this was already the case before; changing Arabic display is a separate decision and needs a Tunisian reviewer.
**Where it lives:** `skillTextLabel` in `src/lib/freelance/service-draft.ts`.
**Trigger:** the Arabic review pass.
