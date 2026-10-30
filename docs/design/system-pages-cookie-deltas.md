# 404 / 500 / cookie banner — diff + decisions

Frames A9 / A10 / A7 (measurements: `docs/design/system-pages-cookie-measurements.md`). Branch `feat/system-pages-cookie-banner` (from origin/main 76c1f2a). Architect rulings of 2026-10-30 are quoted as **R1–R3** below and applied as written.

## Rulings applied
- **R1 consent cookie.** First-party `servyou_consent` = `{ v: 1, audience: bool, ts }`, SameSite=Lax, Secure (on https), valid **6 months**, then asked again; a bumped `v` also re-asks. Read on the **server** (root layout) so the banner is in the first HTML — no flash. No overlay, the page stays usable.
- **R2 modal.** Essentiels always on (Supabase auth + Turnstile listed) · Mesure d'audience toggle **off by default** (nothing uses it today) · Préférences « Toujours actif », no toggle (`servyou_lang` is written only when the visitor picks a language — verified: `LanguageToggle` and the Paramètres save are its only writers). One helper — `hasConsent('audience')` (server, `lib/consent/server.ts`) and `useConsent().hasConsent('audience')` (client) — so future analytics loads only on consent. **No analytics script is added.** Withdrawal as easy as giving: « Gérer les cookies » in the footer reopens the modal.
- **R3 system pages.** `not-found.tsx` and `error.tsx` updated to A9 / A10 (not rebuilt); new `app/global-error.tsx` (own `<html><body>`, no MarketingShell, no data).

## Diff
| # | Class | Frame | Current |
|---|---|---|---|
| 1 | DIFFERENT | 404: shell-less centred card, eyebrow « Erreur 404 », CTA + link | 404 inside MarketingShell (header + footer), large « 404 », 3 actions + « Liens utiles » chips |
| 2 | DIFFERENT | 500: card with 2 px danger border, eyebrow « Erreur 500 · réf. … », « Réessayer » + « Retour à l’accueil » | 500 inside MarketingShell, 3 actions, TODO for the reference id |
| 3 | MISSING | — (R3) | no `global-error.tsx`: a root-layout crash shows Next's bare default |
| 4 | MISSING | banner (card, 3 buttons) + « Personnaliser » modal | no banner exists; `legal.cookies.s5` already promises one |
| 5 | MISSING | — (R2) | no consent storage, no helper, no way to withdraw |

## Decisions I made (numbered, reversible)
- **D1 Dropped with the old 404 / 500:** the MarketingShell chrome, the « Liens utiles » chips and the « Nous contacter » link (the frames draw two actions only). The contact page stays reachable from the footer of every normal page. The 500 body still says « contactez-nous » as drawn, without a link.
- **D2 The 500 reference is the real `error.digest`.** « Erreur 500 · réf. {digest} » when Next provides one (it ties the page to the server log line), « Erreur 500 » otherwise. No invented id.
- **D3 `SystemStateScreen` grows two optional capabilities** (existing K1–K4 callers unchanged): an `eyebrow` line above the title, and a `cta` that may be `{ onClick }` — « Réessayer » is a button, not a link. `SettingRow` gets a `status` variant (a fixed state such as « Toujours actif ») for the cookie modal.
- **D4 `global-error.tsx`** renders in place of the root layout, so it cannot use anything the layout provides: French strings read straight from the dictionary (`t(key, 'fr')`, pure), `globals.css` imported by the file itself, plain `<a href>` (no router context), the wordmark as text (no S-mark image / `next/image`), « Réessayer » = `retry`. French only, as ruled.
- **D5 Banner placement.** The frame's `blue/950` is the artboard backdrop, so the real banner is a **fixed bottom card** (720 from `sm`, inset 16 at 375), `shadow-lg`, **no scrim, no focus trap**; it is the last thing in tab order and does not take focus.
- **D6 « Refuser tout » and « Accepter tout » get equal weight — NOT as the frame literally draws them.** The frame fills « Accepter tout » (primary) and outlines « Refuser tout » (secondary); R1 asks for equal weight. Built as **two identical secondary buttons** (same size, same order cost, neither nudged), « Personnaliser » ghost beside them. If you want the frame's emphasis instead it is one prop.
- **D7 Modal rows differ from the frame** (R2): Essentiels and Préférences show a plain « Toujours actif » instead of an on-toggle (a disabled control is a dead control). Essentiels lists what it covers (« Connexion (Supabase) et protection anti-robots (Cloudflare Turnstile) »). Préférences says what is true — « Retient la langue que vous choisissez. » — the frame's « vos choix d’affichage » names a cookie that does not exist.
- **D8 Consent validity is checked in code, not only by `Max-Age`.** `parseConsent` rejects a wrong `v`, a missing / non-boolean field, a `ts` in the future (> 1 day of skew) or older than 183 days; a rejected cookie reads as « no consent ». Saving a choice, including a refusal, writes a fresh `ts`.
- **D9 The banner shows on every route** (it is mounted by the root layout) including 404 / 500 and the K1–K4 pages; `global-error` does not show it (no provider there).
- **D10 Modal mechanics** are the same wiring as `ConfirmModal` / `mon-compte/ModalShell` (scrim, scroll lock, Escape, Tab trap, focus restored) — a third copy, so logged as a follow-up (promote at the next consumer) rather than refactored here. Closing the modal without saving changes nothing; the banner stays if there is still no valid consent.
- **D11 « Enregistrer mes choix » saves the audience toggle** (and the two fixed categories are implied). « Refuser tout » in the modal footer saves audience = false.

## Legal copy — PROPOSED, not edited (R3)
`legal.cookies.*` is the founder's text; I did not touch it. It no longer matches reality in four places:
1. **s2** lists « Cookies de mesure d'audience anonymisée » as if used. Proposed: « Cookies de mesure d'audience anonymisée — uniquement si vous l'activez dans « Gérer les cookies ». Aucun cookie de ce type n'est déposé aujourd'hui. »
2. **s2** does not list the consent cookie nor the anti-bot check. Proposed additions: « Cookie de consentement (servyou_consent) — rôle : mémoriser votre choix ; durée : 6 mois ; statut : strictement nécessaire » and « Protection anti-robots (Cloudflare Turnstile) — rôle : sécuriser la connexion et les formulaires ; statut : strictement nécessaire ».
3. **s2** « Cookie de préférence linguistique » is accurate — add « déposé uniquement quand vous choisissez une langue ».
4. **s5** promises « mémorisé pour les visites suivantes »; proposed: « Votre choix est mémorisé pendant 6 mois, puis nous vous le redemandons. Vous pouvez le modifier ou le retirer à tout moment avec « Gérer les cookies », en bas de chaque page. »

## Other notes
- The banner and modal copy promise « une mesure d’audience anonyme » (as drawn) while nothing is measured today; the toggle is off by default and wired to nothing (R2).
- Arabic strings for the banner, modal and system pages are drafts, marked `REVIEW_AR_TRANSLATION`.
- Figma MCP reads: 0 (bridge dumps).

## Added after the browser gate
- **D12 The banner can sit over the bottom of a short, centred page** (404 / 500 / K1–K4) until the visitor answers it — it is a non-blocking card by ruling, and answering is one click. The card's primary action stays visible at 1440; at 375 the banner covers most of the lower half until answered.
- **D13 The card title is 22 on a 27 line** (the frame measures h27 / two lines = 54): without the explicit line-height the title inherits 1.5 and every card grew by 6 px. Applied in `SystemStateScreen` (so K1–K4 share it — the same Figma text style) and `global-error`.

## Verification (browser, own isolated sessions, URL asserted before each capture; 0 production writes — the only writes are the first-party cookie in the test browser)
- Server-rendered banner (curl, no browser): no cookie → the banner is in the first HTML; a valid cookie → absent; an expired cookie (2020 timestamp) → present. No flash.
- Banner FR + AR × 1440 + 375: 720 wide / radius 16 / buttons 138·129·140 wide at 1440 (frame 139·128·139); at 375 the three wrap onto two rows (frame h128); the page behind stays clickable; no scrim, no `aria-modal`.
- Modal FR + AR × 1440 (+ FR 375): 480 wide; one switch (audience, OFF); « Toujours actif » on the two necessary rows; opening writes no cookie; Refuser → cookie `{v:1,audience:false}`, reload → no banner, footer « Gérer les cookies » reopens it, Escape closes without saving; toggle on + « Enregistrer mes choix » → `audience:true`.
- 404 FR + AR × 1440 / FR × 375 and 500 FR + AR × 1440 / 375 (+ `global-error` harness): card 480 (FILL at 375), pad 32, radius 12, 1 px subtle border (500: 2 px danger), real `error.digest` as the reference; no raw keys, no horizontal overflow.
