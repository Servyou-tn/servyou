# Follow-ups — Arabic packet 2 (`fix/ar-packet-2`, 2026-11-03)

## AR singular vs plural address (walk #35, second half) — needs a founder ruling

**What** The app speaks to the user in the singular (« أنشئ حسابك », « يمكنك »); the landing (« How it works », its three tabs) and the
auth funnel (« مرحبا بكم », « نسيتم كلمة المرور ؟ », « تحققوا من بريدكم ») use the plural. About 55 strings in `src/lib/i18n/ar.ts`
(landing.howItWorks.*, signup.intent.*, verifyEmail.*, forgotPassword.*, newPassword.*, signin.passwordResetSuccess.message,
product.detail.follow_shop).

**Why deferred** The packet named brand, freelance and « مشترياتي »; moving ~55 marketing strings to one form is a copy decision, and
the drafts need an Arabic review either way.

**Where it lives** `src/lib/i18n/ar.ts` (the landing block from `landing.howItWorks`, the auth block from `signup.intent`).

**Trigger** The founder picks singular (the app's form) or plural.

## Seller-written text: surfaces not covered here

**What** This PR isolates seller text where the walk saw it scramble (product page, cards, order pages, the request form and its
confirmation, service page title / description). Not touched: the shop page description (D3), the freelancer bio and portfolio (D4),
`/recherche` result cards, the seller's « Mes produits / Mes services » rows.

**Why deferred** Not reported by the walk; same one-line fix (`<bdi>` for a line, `dir="auto"` for a paragraph) when they are next touched.

**Where it lives** `src/app/boutique/[id]/_components/ShopDetail.tsx`, `src/app/freelance/[id]/_components/FreelancerDetail.tsx`,
`src/components/listings/*`, `src/app/mes-produits/_components/ProductRow.tsx`, `src/app/mes-services/_components/ServiceRow.tsx`.

**Trigger** The next AR pass or a report of scrambled text there.
