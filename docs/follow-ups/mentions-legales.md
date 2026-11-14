# Mentions légales — follow-ups (`feat/mentions-legales`, 2026-11-14)

Loose ends from the « Mentions légales » PR (new `/mentions-legales` page + the data-controller line in the privacy
policy). Founder decisions of 2026-11-14: ServYou is operated by Moatez Sahbeni personally (personne physique); the page
shows the full name, « Ariana, Tunisie », bonjour@servyou.tn and the /contact form — no phone, no street address yet.
Every lawyer item below is a QUESTION logged for the legal review: this PR changed no other legal claim.

## 🔴 BEFORE LAUNCH — add the domiciliation postal address

**What:** add the domiciliation postal address to `/mentions-legales` (section 1 « Éditeur du site », and section 3
« Responsable du traitement ») and to the privacy policy's controller line (section 1 « Notre engagement »), in FR, AR
and EN. Put the address between backticks (`` `…` ``) like the hosts' addresses, so it stays left-to-right in Arabic, and
bump both dates (`legal.mentions.updatedDate`, `legal.privacy.updatedDate`) to the day it ships.
**Why deferred:** founder decision — the domiciliation address does not exist yet; it will be added before public launch.
**Where it lives:** `src/lib/i18n/fr.ts`, `ar.ts`, `en/common.ts` — `legal.mentions.s1.body`, `legal.mentions.s3.body`,
`legal.mentions.summary` (one line), `legal.privacy.s1.body` (last paragraph); the dates `legal.mentions.updatedDate`,
`legal.privacy.updatedDate`. `src/lib/legal/legal-structure.test.ts` and `legal-page-shell.render.test.ts` check the
controller line — update their expected text with it.
**Trigger:** the domiciliation contract is signed — and in any case before public launch.

## 🟠 SPEED — the legal text ships in every public page's first-load JavaScript

**What:** this PR added +3.0 KB gzip to the first load of **every** public page (CI's budget table: `/` 426.0 → 429.0 KB,
the 7 marketing pages 389.9 → 393.0, the heart pages +3.0–3.1) — although the legal notice is read on one page and
rendered on the server. The reason: `src/lib/i18n/index.ts` puts the three dictionaries (`fr`, `ar`, `en`) in one object,
and client components import `t()`, so every string of every language reaches every page's client bundle. Rough sizes
(gzip of the TS source, approximate): all `legal.*` strings in the three languages ≈ 25 KB; the three dictionary files ≈
215 KB — about half of a marketing page's ~393 KB first load. The PR raised all 18 budgets by exactly +3 KB (each page
keeps the headroom it had on main) and gave `/mentions-legales` 394 KB, per the budget file's rule.
**Candidate fixes (a speed PR, founder's call):** (a) resolve the legal documents' strings on the server only — the five
legal pages are Server Components, so `legal.*` (~25 KB) could leave the client dictionary; (b) ship only the visitor's
language to the client (the language is a cookie read on the server), which removes roughly two thirds of the dictionary
weight. Lower the 18 budgets in the same PR.
**Why deferred:** a change to how every page gets its strings (`t()` / `dicts` in `src/lib/i18n/index.ts`, the five legal
pages, the parity tests) — not this PR's focus.
**Where it lives:** `src/lib/i18n/index.ts` (`dicts`), `src/lib/i18n/fr.ts` / `ar.ts` / `en/`, `scripts/perf/first-load-budget.json`.
**Trigger:** the next speed PR, or the next PR that needs to raise the budgets again.

## Lawyer: the privacy policy says « no transfer », the legal notice names a US and a Singapore host

**What:** `legal.privacy.s4.body` says the data is hosted in Europe and « Nous n'effectuons aucun transfert vers des
juridictions n'offrant pas ce niveau de protection » (summary: « serveurs européens, sous protection RGPD »). The servers
used are in Frankfurt, but the contracting companies are **Vercel Inc.** (Delaware, USA) and **Supabase Pte. Ltd.**
(Singapore) — now named publicly on `/mentions-legales`. Other processors are not named anywhere: **Sentry** (error
monitoring — the CSP allows both `*.ingest.sentry.io` and `*.ingest.de.sentry.io`), **Cloudflare Turnstile** (the
sign-in / sign-up CAPTCHA) and the future e-mail sender (Resend, planned). Umami is named in privacy section 8.
**Question for the lawyer:** does the policy need a processor list and a transfer basis (the providers' DPAs / standard
contractual clauses), and does the « aucun transfert » sentence hold?
**Why deferred:** out of scope by the brief (« do NOT change other legal claims in this PR »).
**Where it lives:** `legal.privacy.s4.body`, `legal.privacy.summary` (FR/AR/EN); `src/lib/security/headers.ts` (CSP hosts).
**Trigger:** the legal-pages lawyer review (`open-legal-pages-lawyer-review-cookie-consent-redaction-consistency.md`).

## Lawyer: Vercel serves static files from its worldwide network, not only Frankfurt

**What:** the production deployment's server functions run in `fra1` (Frankfurt — set in the Vercel dashboard, not in the
repo; read from the deployment on 2026-11-14), and the page says exactly that (« fonctions serveur exécutées dans la région
de Francfort »). Static pages, scripts and images are delivered by Vercel's global CDN, from the edge location nearest the
visitor. The page does not claim otherwise, but it does not say it either.
**Question for the lawyer:** should the hosting section mention the CDN?
**Where it lives:** `legal.mentions.s4.body` (FR/AR/EN).
**Trigger:** the lawyer review.

## Lawyer: what else a Tunisian legal notice for a personne physique must show

**What:** the page shows name, status (personne physique), city, e-mail and the contact form. Not shown: a phone number
(founder decision), a street address (pending — first entry), any registration number.
**Questions for the lawyer:** (1) does operating the platform as a personne physique require a registration (RNE, matricule
fiscal / patente) whose number must appear here? (2) is a phone number required for the editor or for the hosts (French
LCEN-style notices list one; is there a Tunisian equivalent)? (3) do the e-commerce information duties of Loi 2000-83,
already cited in the terms, apply to the platform operator itself?
**Where it lives:** `legal.mentions.s1.body`, `legal.mentions.s4.body`.
**Trigger:** the lawyer review, before public launch.

## Lawyer: INPDP declaration for the processing

**What:** the privacy policy cites Loi organique 2004-63 and names the INPDP as the complaint authority (section 13), but
says nothing about a declaration or authorisation of the processing with the INPDP.
**Question for the lawyer:** is a prior declaration / authorisation needed for ServYou's processing (accounts, phone numbers
for deliveries, reports), has it been made, and should the policy cite its reference?
**Where it lives:** `legal.privacy.s13.body` (and possibly `s1`).
**Trigger:** the lawyer review, before public launch.

## Lawyer: « Servyou » is written as if it were a legal person

**What:** the terms say « La marque Servyou, le logo, l'interface, et le code source sont la propriété de Servyou »
(`legal.terms.s9.body`) and the privacy policy « Servyou s'engage à protéger vos données » (`legal.privacy.s1.body`).
Servyou is a brand, not a company: the legal notice now says « Servyou est une marque exploitée par son éditeur, Moatez
Sahbeni » and that the name, logo, interface and the editor's content « lui appartiennent ». The two do not contradict each
other, but the terms should probably name the editor too. Nothing in this PR says « marque déposée » — whether the brand
is registered (INNORPI) is unknown here.
**Where it lives:** `legal.terms.s9.body`, `legal.privacy.s1.body`, `legal.mentions.s5.body` (FR/AR/EN).
**Trigger:** the lawyer review; or the day the brand is registered / a company is created (every « Servyou » owner
sentence then changes).

## Lawyer: the 16+ age rule against the rules for minors' data

**What:** the privacy policy (section 11) and the terms allow accounts from 16 and selling from 18.
**Question for the lawyer:** does Loi 2004-63's regime for processing a child's data (and the age at which Tunisian law
stops treating a user as a child) require guardian consent — or more — for 16–17-year-old buyers?
**Where it lives:** `legal.privacy.s11.body`, `legal.privacy.s3.body`; the sign-up age check.
**Trigger:** the lawyer review.

## Consistency: the footer credit and the support e-mail

**What:** (1) the navy footer reads « Construit en Tunisie par Moatez Z. » (`landing.footer.founder_credit`, FR/AR/EN)
while the legal pages now give the full name « Moatez Sahbeni ». (2) The landing footer shows **contact@servyou.tn**
(hard-coded `mailto:` in `src/components/landing/LandingFooter.tsx`), while the legal pages, `/aide` (`SUPPORT_EMAIL`) and
the contact page use **bonjour@servyou.tn**.
**Why deferred:** not legal claims, but out of scope (one PR, one focus) and the founder's call: which name in the credit,
and which mailbox really exists.
**Where it lives:** `landing.footer.founder_credit` (fr.ts / ar.ts / en/common.ts); `LandingFooter.tsx` lines with
`contact@servyou.tn`; `src/components/aide/support.ts`.
**Trigger:** founder decision; at the latest when the servyou.tn mailboxes are set up.

## Arabic: the name and the page title need a native review

**What:** the Arabic page keeps « Moatez Sahbeni » and the hosts' names / addresses in Latin script (official spellings,
never translated). The page title « الإشعارات القانونية » and the legal terms (« المسؤول عن معالجة المعطيات الشخصية »,
« شخص طبيعي », « مدير النشر ») are drafts marked REVIEW_AR_TRANSLATION.
**Question for the founder:** should the Arabic page also give the name in Arabic script — and its exact spelling?
**Where it lives:** `src/lib/i18n/ar.ts` — the `legal.mentions.*` block, `legal.privacy.s1.body`, `*.mentions` labels.
**Trigger:** the native Tunisian review (`open-arabic-legal-content-translations-need-native-tunisian-review.md`).
