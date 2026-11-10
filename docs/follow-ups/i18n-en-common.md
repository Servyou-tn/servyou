# English — common area (`feat/i18n-en-common`, 2026-11-10)

## « Paiement à la livraison sécurisé » in French and Arabic
**What:** `demander.trust` says « Paiement à la livraison sécurisé via Servyou » (FR, and its AR twin). Servyou does not
secure payments, and the project rule bans « paiement sécurisé » claims. The English is honest: « Cash on delivery,
arranged through Servyou ».
**Why deferred:** changing French / Arabic copy is out of scope for an English PR and needs the founder's OK.
**Where it lives:** `src/lib/i18n/fr.ts` and `ar.ts`, key `demander.trust`.
**Trigger:** founder approval of the new wording (suggested: « Paiement à la livraison, organisé via Servyou »).

## FAQ « Pourquoi français et arabe seulement ? » is out of date
**What:** `faq.langues.q1` (FR + AR) still says English will come later. The English answer already says English is
available.
**Why deferred:** French / Arabic copy change.
**Where it lives:** `fr.ts` / `ar.ts`, `faq.langues.q1.q` / `.a`.
**Trigger:** the same copy pass as above.

## Legal pages in English are a translation
**What:** terms, privacy, cookies and accessibility now have an English version. The French text remains the reference
until the legal review that the draft banner already announces.
**Why deferred:** needs the lawyer's review, like the French.
**Where it lives:** `src/lib/i18n/en/common.ts`, `legal.*`.
**Trigger:** the pre-launch legal review — review FR and EN together.

## Help answers quote button labels from the other two areas
**What:** `aide.g.*` answers quote labels such as « Mark as delivered », « Confirm receipt », « Publish the product ».
They follow the glossary, but the Freelancer and Shop agents write the real buttons.
**Why deferred:** their PRs are not merged yet.
**Where it lives:** `src/lib/i18n/en/common.ts`, `aide.g.*`.
**Trigger:** after both agent PRs are merged — compare the quoted labels with `en/freelancer.ts` and `en/shop.ts`.
