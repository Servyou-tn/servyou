# Aide rebuild PR-B2 — logged, not fixed (feat/aide-rebuild)

Found while grounding the help copy in the BUILT product (fact sheet from the code, 2026-10-28); ranked.

## A. Figma copy that does not match the product (answers say what is true)

1. **« Refusée » does not exist.** The shop_owner specimen 558:38835 (« Que se passe-t-il si le client refuse le colis ? »)
   tells the seller to mark the order « Refusée » and says it « ne décompte pas votre stock ». The DB has one terminal status,
   `cancelled`; `refused` is only a UI alias that renders « Annulée » (`lib/orders/order-status.ts:60`), and stock is never
   decremented by an order. The answer says: cancel with a reason, status « Annulée », nothing collected, adjust stock by hand.
   The Figma memory note « 7 stages + 2 terminal states (annulée / refusée) » needs the same correction.
2. **« Confirmer sur WhatsApp » does not accept the order.** The specimen says it opens the chat AND moves the order to
   « Acceptée ». Built: « WhatsApp » and « Accepter » are two controls (`OrderActionRow.tsx:33-37`, deliberate — confirm with the
   client BEFORE accepting). The answer describes the two-step flow.
3. **« Comment publier ma boutique ? » has no feature behind it.** A shop has no draft/published state: it is public from
   creation (unless admin-hidden or the owner is suspended). The question is kept (it is the shop search placeholder); the answer
   says so and points at publishing products instead.
4. **Printable « bon de livraison » / « bordereau de ramassage » are not built** (code comments: « deferred to the
   delivery-documents PR »). The answer says it is coming and what to use meanwhile. The shop-logo helper
   (`fr:1350`) also promises « vos bons de livraison » — same untruth.
5. **« Réponse sous 24 h » vs the product's 24–48 h.** `/contact` promises « 24 à 48 heures »; the panel uses 24–48 h to match.
   One key (`aide.contact.responseTime`) if the founder wants 24 h.
6. **The search specimen 449:18312 is illustrative.** « 4 questions » and a 4th Acheter question (« Comment annuler une
   commande ? ») that is not in the main frame (the group bakes exactly 3). Search matches question + answer, so « commande »
   returns 10 on the freelancer config. Cancellation is covered inside « Que signifient les statuts de ma commande ? ».

## B. Product defects noticed (outside this PR)

7. **« Force du profil » never counts portfolio items** — `portfolio: false` is hard-coded (`freelancer-dashboard.ts`), so the
   ring tops out at 75 % while the checklist says « Ajoutez 2 réalisations ». The answer does not promise it counts.
8. **`fr:2129` « Votre profil est maintenant visible »** is shown right after creation, but a profile is only visible once a
   service is active.
9. **Stock is not decremented by orders nor restored by cancellation** (the DB only refuses `quantity > stock_count`). The
   answers tell sellers to update stock by hand; that line should go when it is automated.
10. **« Signaler » is wired only on shop and freelancer pages.** Product/service pages show static text (B3 wires them);
    missions and users have no report UI. The answer lists what exists TODAY.
11. **Support WhatsApp number is a placeholder** (`wa.me/216XXXXXXXX` in `/contact`, `+216 XX XXX XXX`). `/aide` links to
    `/contact` via `SUPPORT_WHATSAPP_HREF` (`components/aide/support.ts`) — **launch blocker**, change it there and in the
    contact page together.
12. **Copy claims not confirmed in code:** FAQ « Le lien est valable 24 heures » (a Supabase setting, no config in the repo);
    landing FAQ « Tous les vendeurs sont vérifiés à l'inscription » (only the age gate + real name exist). Neither is repeated in
    the Aide answers.

## C. Content-maintenance triggers (the Aide answers describe today's product)

13. **After B3 merges** → rewrite `aide.g.securite.a2` (FR + AR): product/service pages will have a real « Signaler ».
14. **After the delivery-documents PR** → rewrite `aide.g.livraison.a2` (« pas encore disponible »).
15. **After stock auto-decrement** → drop the manual-stock sentences in `aide.g.produits.a3` and `aide.g.commandes.a3`.
16. **If a shop publish state is ever added** → rewrite `aide.g.boutique.a3`.
17. **Any change to the proposal / mission / order limits** (5 active, 10 per mission, 30 days) → `missions.a1/a2`, `annonces.a2/a3`.

## D. Build notes

18. **The shop_owner config was not checked in a browser** — no shop-owner fixture account exists and a real owner's session was
    not minted. Covered by unit tests (role → groups, every key present in FR + AR). Needs one founder look.
19. **MEDIUM — on mobile the contact panel is the LAST thing** (y ≈ 3300px at 375). A user who cannot find an answer scrolls the
    whole list to learn they can write to us. Options: panel above the list below `lg`, or a « Nous écrire » link beside the title.
20. **AR is a draft** (marked `REVIEW_AR_TRANSLATION`): needs a native read. The results caption uses the repo's own plural system (`tn('aide.search.count')` in `i18n/plurals.ts`: 1 / dual / other in Arabic, 1 / other in French). Like every other count there, 11+ folds into `other` (« 15 أسئلة »), which is not strict Arabic number agreement — a limit of `plurals.ts`, not of this PR.
21. **`WhatsAppGlyph` now has a second copy** (`mes-commandes/_components/OrdersList.tsx` + `components/aide/`). Promote to a
    shared icon at the third use.
22. **B1 (#223) radius miss:** the Comptes connectés provider rows and « Bientôt » badge are `rounded-lg` (10px); the frame is
    r8 (`rounded-md`).
23. **Old keys removed:** `aide.faq.q1..a5` and `aide.contactWhatsApp` (the replaced 5-FAQ page was their only consumer).

## E. Sonnet review (commit 2) — what was fixed, what was left

**Fixed from the fact-check (6 wrong/incomplete answers, FR + AR):** `livraison.a2` claimed the seller order detail shows the client's phone
(it never does — only the « Contacter sur WhatsApp » reveal); `services.a1` omitted the 1–5 compétences required to publish;
`engagements.a1` used the TAB names (À traiter / En cours / Livré…) as if they were statuses — it now leads with the pill
(En attente / Acceptée / Travail livré / Reçue / Annulée) and names the tab; `boutique.a1` called a governorate field « ville et gouvernorat »
(one field labelled « Ville »); `livraison.a1` / `boutique.a1` sent users to « Modifier ma boutique » for delivery settings, which live behind the
« Configurer horaires, livraison, paiement et catégories » link; the answers no longer tell users to write « par WhatsApp » while the number is a
placeholder; `securite.a2` now says the « Signaler ce produit » text is not active yet. AR `annonces`: label case endings aligned with the UI labels.

**Fixed from the code review:** clear-search button dropped focus to `<body>` (now refocuses the field) and had an 18px hit area (46px via `::after`);
the live region echoed every keystroke (now one persistent `sr-only` status, debounced 500 ms, that also carries the no-result text); no `maxLength`
and a long query overflowed the page (cap 100 + the heading can shrink and wrap); 24 `role="region"` panels removed; `t()` expanded `$&` / `$$` in
user input (replacer function); breadcrumb `<nav>` was labelled « Aide » (new `aide.breadcrumb.label`); the three loaders now run in parallel.

**Left open:**
24. **Collapsed answers are `hidden`**, so Ctrl+F cannot find them, and a search shows its matches collapsed. `hidden="until-found"` + auto-open of the
    single/first match would fix both; not in the Figma, so not done unasked.
25. **Arabic folding is partial**: `ى/ي` and `ة/ه` are not folded in `normalizeForSearch` (accents, harakat, tatweel and the alef family are).
26. **`aide.g.produits.a3` says « Épuisé »** (the seller list pill); the product form helper says « Rupture de stock ». Harmless, worth one wording.
27. **The h1 is `text-[32px] leading-[38px]`** (copied from `/parametres`) instead of the `text-h1` token — fix both pages together.
28. **`/parametres` has the same breadcrumb `aria-label` flaw** (labelled with the page title).
29. **`tn()` expanded `$&` / `$$` in its variables** like `t()` did, and `page_header.recherche.subtitle` passes the user's raw search query through it. Fixed in `plurals.ts` with the same replacer-function change (found while moving the Aide caption onto `tn()`).
