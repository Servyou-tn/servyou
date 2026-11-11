# English for code-side lists — follow-ups (`feat/i18n-en-data-lists`, 2026-11-11)

## Skill labels are still French in English
**What:** the ~279 skill labels in `src/lib/taxonomy/service-categories.ts` (and the `{fr, ar}` skill pairs on the service and freelancer cards) have no English. In English they show French.
**Why deferred:** they belong to the freelancer journey (agent A's English pass, open in parallel), and the list is large enough to need its own review.
**Where it lives:** `src/lib/taxonomy/service-categories.ts`, `skillLabelPair` in `src/lib/freelance/service-draft.ts`, `FreelancerCard.tsx`, `ServiceListingCard.tsx`.
**Trigger:** after the freelancer English PR merges. Add `labelEn` and render through `pickLabel`.

## Free-text cities are not translated
**What:** a city that is not one of the 24 governorates is shown as typed, in every language.
**Why deferred:** it is user text, not a label.
**Where it lives:** `localizeCity` in `src/lib/marche/missions.ts`.
**Trigger:** only if cities become a fixed list.
