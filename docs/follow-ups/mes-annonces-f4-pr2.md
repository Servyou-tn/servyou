# Mes annonces rebuild — F4 detail (`feat/mes-annonces-f4-detail`, 2026-10-30)

## « Modifier l'annonce » is a disabled button
**What:** no edit route yet; the button is disabled with « Bientôt disponible ».
**Trigger:** PR-3 — `/mes-annonces/[id]/modifier` reusing the F2 form + `validateJobPost(input, now, original)` (the stored row, never client input). The disabled button becomes a link.

## Status pill differs from the frame by one tint step
**What:** the frame draws a bespoke blue/50 « nouveau » chip for « Ouverte »; the page uses the shared `StatusPill` (`ouverte` = blue/100 · blue/700) so the list and the detail read the same (D18).
**Trigger:** a design-system decision on whether `ouverte` moves to blue/50.

## Expand toggles have no `aria-controls`; « Lire la suite » can expand nothing
**What:** « + N autres propositions » and « Lire la suite » set `aria-expanded` but not `aria-controls`; the message toggle shows for any text over 240 characters even when it already fits in 3 lines on a wide card.
**Why deferred:** a11y nit, no wrong behaviour; fixing the second needs a measured overflow check (`scrollHeight > clientHeight`) in a client effect.
**Trigger:** the accessibility pass (`docs/design/accessibility.md`).

## WhatsApp (h44, shared `md`) beside « Voir le profil » (h40)
**What:** the frame draws both at one height; `WhatsAppContactButton` `md` is 44 (H13's CTA), `Button` `md` is 40. They are centred, not stretched.
**Trigger:** the next pass over the button atoms — measure once, move every consumer together.

## AR copy is a draft; one diacritic variant
**What:** every new `annonces.detail.*` Arabic string is marked `REVIEW_AR_TRANSLATION`. « تحديد كمُسنَد » (action) carries diacritics while the list's status word is « مسند ».
**Trigger:** the founder's Arabic review pass.
