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
**What:** the form sends `type=service` (the city filter only exists for services). A product query like « sneakers » lands on services and relies on the results page's cross-side nudge.
**Why deferred:** a mixed search (both sides at once) does not exist yet in `/recherche`.
**Where it lives:** `Hero.tsx` `HeroSearch` (hidden `type` input).
**Trigger:** if /recherche gets a combined result view, drop the hidden input.

## The S-mark is cropped at 1024–1279 px
**What:** between 1024 and 1279 px the pyramid scales to 0.8 from the end edge, so the right part of the S backdrop is clipped by the box. Decorative only, photos stay whole.
**Why deferred:** no Figma frame for that width; the founder judged it at 1440 and 375.
**Where it lives:** `Hero.tsx`, the `role="img"` wrapper classes.
**Trigger:** a Figma frame for small laptops, or founder feedback.
