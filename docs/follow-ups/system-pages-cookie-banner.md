# 404 / 500 / cookie banner (`feat/system-pages-cookie-banner`, 2026-10-30)

## « Gérer les cookies » lives in the marketing footer only
**What:** the withdrawal entry is in the navy `Footer` (landing + marketing pages), as ruled. A signed-in visitor on the app shell (sidebar / topbar, no footer) has no link to reopen the modal; they can still do it from any marketing page.
**Why deferred:** the ruling named the footer; the app shell has no footer, and where the entry belongs there (Paramètres › Confidentialité, the user menu) is a product call.
**Trigger:** before any analytics is wired, add the entry to Paramètres › Confidentialité (`useConsent().openSettings`) so withdrawal is one click from every page.

## `legal.cookies.*` no longer matches reality (needs the founder's approval)
**What:** four proposed sentences are in `docs/design/system-pages-cookie-deltas.md` (« Legal copy »): the audience cookie does not exist today, the consent cookie and Turnstile are unlisted, the language cookie is set only on choice, and the banner now remembers the choice for 6 months.
**Why deferred:** legal text is the founder's; not edited here.
**Trigger:** the founder approves the wording.

## The banner promises « une mesure d’audience anonyme » while nothing is measured
**What:** the banner / modal copy is the frame's. Nothing reads `audience` today, so the toggle is wired to nothing but the stored choice.
**Trigger:** the first analytics integration — it must load only behind `await hasConsent('audience')` (server) / `useConsent().hasConsent('audience')` (client), and the legal copy above must be approved first.

## A third copy of the modal wiring
**What:** `CookieSettingsModal` repeats the scrim / scroll lock / Escape / Tab trap / focus-restore of `marche/ConfirmModal` and `mon-compte/ModalShell`.
**Why deferred:** each differs in structure (plain-string body, form fields, header + ✕ + footer); a shared shell is its own refactor.
**Trigger:** the next modal — promote one `ModalShell` to `components/ui` and port the three.

## « Refuser tout » / « Accepter tout » are identical secondary buttons
**What:** the frame fills « Accepter tout » (primary) and outlines « Refuser tout » (secondary); the ruling asks for equal weight, so both are secondary (D6).
**Trigger:** the founder prefers the frame's literal emphasis — one prop in `CookieBanner`.

## `global-error` is French only and has no S-mark
**What:** it replaces the root layout, so it cannot read the language cookie through the layout and cannot use `next/image`; the wordmark is text.
**Trigger:** none unless a root-layout crash in Arabic matters — a client-side read of `servyou_lang` would do it.

## AR copy is a draft
**What:** every new `cookies.*` and `system.notFound.*` / `system.error.*` Arabic string is marked `REVIEW_AR_TRANSLATION`.
**Trigger:** the founder's Arabic review pass.

## The banner covers sticky save bars until it is answered
**What:** the banner is `fixed bottom-0 z-40`, above the app's `sticky bottom-0 z-10` bars (`WizardFooter`, the freelancer profile `StickyFooter`, `EditProductForm`, `ProductForm`). A signed-in visitor with no consent cookie who opens a wizard sees the banner over « Suivant » / « Enregistrer » until they answer; at 375 the three buttons wrap and the card is ~250–300 px tall.
**Why deferred:** the ruling says the banner must not block the page; padding the page while it shows (or lowering it) is a product call, and every affected page is its own surface.
**Trigger:** the founder's visual check of a form page with the banner showing — if it reads as blocking, add `padding-bottom` to the shell while the banner is mounted (the provider already knows).

## The banner is the last tab stop, and the choice is not re-read across tabs
**What:** it renders after `{children}`, so keyboard / screen-reader users reach it after the whole footer; and `useState(initial)` keeps the first server value — a choice made or withdrawn in another tab, or an expiry during a very long session, shows only after a navigation / reload.
**Trigger:** accessibility pass (`docs/design/accessibility.md`) — a skip link or `visibilitychange` re-parse would cover both.
