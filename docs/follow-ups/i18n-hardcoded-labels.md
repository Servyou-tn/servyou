# Hard-coded labels found by the English scan — follow-ups (`fix/i18n-hardcoded-labels`, 2026-11-11)

## Dead component with French text
**What:** `src/components/marche/ExpandableSearch.tsx` has hard-coded French (« Rechercher… », « Échap pour fermer »…) but is no longer rendered anywhere (retired with MarcheTopBar).
**Why deferred:** no visitor sees it; deleting a component is out of this PR's focus.
**Where it lives:** `src/components/marche/ExpandableSearch.tsx`.
**Trigger:** the next dead-code cleanup — delete it.

## Root meta description is French in every language
**What:** `src/app/layout.tsx` sets `description: "Votre marketplace tunisienne"` as the default for pages without their own; search engines and link previews show it in French.
**Why deferred:** changing it means making the root metadata language-aware (`generateMetadata`), which touches every page's fallback.
**Where it lives:** `src/app/layout.tsx` `metadata`.
**Trigger:** the SEO pass before launch (with real descriptions per page).
