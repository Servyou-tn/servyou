# 404 / 500 / cookie banner (`feat/system-pages-cookie-banner`, 2026-10-30)

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

## The banner is the last tab stop, and the choice is not re-read across tabs
**What:** it renders after `{children}`, so keyboard / screen-reader users reach it after the whole footer; and `useState(initial)` keeps the first server value — a choice made or withdrawn in another tab, or an expiry during a very long session, shows only after a navigation / reload.
**Trigger:** accessibility pass (`docs/design/accessibility.md`) — a skip link or `visibilitychange` re-parse would cover both.

## Sticky-bar offset lands one frame after hydration
**What:** the banner is in the server HTML but `--cookie-banner-h` is published by an effect, so a sticky bar sits at the viewport bottom for the first paint and then lifts above the banner. At 375 the banner is ~402 px of an 812 px screen; with the bar above it ~260 px of content remains until the visitor answers.
**Trigger:** if the jump or the cramped mobile view reads badly in the founder's check — a fixed per-breakpoint fallback in CSS would remove the jump; a shorter 375 card needs a frame change.

## Any new sticky / fixed bottom bar must use the offset
**What:** `bottom-[var(--cookie-banner-h,0px)]` is applied by hand to the four existing sticky bars (`WizardFooter`, `StickyFooter`, `ProductForm`, `EditProductForm`); a new one added with `bottom-0` would sit under the banner again.
**Trigger:** the next sticky action bar — or promote a `sticky-bottom` utility if a fifth appears.

## Body padding exposes the `<body>` background behind the banner
**What:** `<body>` carries the banner's height as bottom padding, so the strip around the card shows `var(--background)` — fine in light mode, dark under `prefers-color-scheme: dark` (the app's surfaces are light-only).
**Trigger:** a dark-mode pass.
