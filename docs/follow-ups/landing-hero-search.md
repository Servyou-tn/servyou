# Landing hero — search, chips, reassurance, S-mark backdrop (`feat/hero-search`, 2026-11-10)

## Arabic strings are a draft
**What:** the 12 new `lp.hero.*` keys in `ar.ts` (placeholder, city picker, chips, reassurance) are marked REVIEW_AR_TRANSLATION.
**Why deferred:** needs a Tunisian speaker.
**Where it lives:** `src/lib/i18n/ar.ts`, next to `lp.hero.photos_alt`.
**Trigger:** the landing AR review pass (same pass as `landing-v3.md`).

## City names stay in Latin script in Arabic
**What:** the city picker lists `freelancer_profiles.city` as stored (Ariana, Sousse, …), so Arabic visitors see Latin names.
**Why deferred:** cities are free text in the DB; translating them needs a city table or a fixed governorate list, which is a schema decision.
**Where it lives:** `src/lib/marche/filter-cities.ts` (`getServiceCities`) → `Hero.tsx` `HeroSearch`.
**Trigger:** when cities become a reference list (governorates) or the marketplace filters get Arabic city names.

## The hero search runs on the services side
**What:** the form sends `type=service` (the city picker is fed by service cities). A product query like « sneakers » lands on services and relies on the results page's cross-side nudge, while label and placeholder mention both sides.
**Why deferred:** a mixed search (both sides at once) does not exist yet in `/recherche`.
**Where it lives:** `Hero.tsx` `HeroSearch` (hidden `type` input).
**Trigger:** if /recherche gets a combined result view, drop the hidden input.

## The S-mark is cropped at 1024–1279 px
**What:** between 1024 and 1279 px the pyramid scales to 0.8 from the end edge, so the right part of the S backdrop is clipped by the box. Decorative only, photos stay whole.
**Why deferred:** no Figma frame for that width; the founder judged it at 1440 and 375.
**Where it lives:** `Hero.tsx`, the `role="img"` wrapper classes.
**Trigger:** a Figma frame for small laptops, or founder feedback.

## Hero small text contrast on blue-500
**What:** white on brand-blue-500 is about 3.7:1; the new 13–14 px chips, « Populaire » (85 %) and reassurance (95 %) sit near 3.2–3.5:1, under WCAG AA 4.5:1 for small text. H1/subtitle were already at 3.7:1.
**Why deferred:** the colours are the founder-approved Figma spec; changing the hero blue or the opacities is a design decision.
**Where it lives:** `Hero.tsx` (chips, popular label, reassurance), the `bg-brand-blue-500` box.
**Trigger:** the accessibility pass, or a founder decision to darken the hero to blue-600 / use full-white small text.

## City list reads every active service row
**What:** `getServiceCities()` selects all active service rows and dedupes in JS; past the PostgREST row cap (1000) cities could be missed. It is now streamed (Suspense) so it never delays the landing.
**Why deferred:** small catalog today (21 active services, 7 cities).
**Where it lives:** `src/lib/marche/filter-cities.ts`.
**Trigger:** a DISTINCT view/RPC when the catalog nears 1000 active services (already noted in that file).

## Arabic: the S backdrop reaches toward the text at 1024–1279 px
**What:** the S stays left-to-right in Arabic, so on small laptops its right side passes behind the start of the search bar and chips (behind them, 20 % white).
**Why deferred:** no overlap at 1440 and 375; decorative only.
**Where it lives:** `Hero.tsx`, `SMarkBackdrop` classes.
**Trigger:** AR visual review on a 1024–1279 screen.
