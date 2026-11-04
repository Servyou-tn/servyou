# I1 « Mon compte » at 375 + /recherche — measurements, diff, decisions

Frames (founder exports in this folder, PNG + dump; no Figma MCP read used):

| Screen | Frame | Export |
|---|---|---|
| I1 Mon compte, 375 | 1595:28325 | `m375-i1-mon-compte` |
| /recherche, 1440 | 1596:41289 | `recherche-1440` |
| /recherche, 375 | 1596:42384 | `m375-recherche` |

I1 ships in PR-2 (with the H8 fixes). /recherche is its own PR-2b — §2 is filled in there.

## 1. I1 — /mon-compte at 375

I1 was built on the older 375 frame 728:64216 (`docs/design/i1-k-measurements.md`). 1595:28325 is the newer one.

### Measured (375)

| Part | Frame |
|---|---|
| root | pad 20/16/32; « content » holds « page » + the footer bar, gap 0 |
| page | pad 20/16/20/16, gap 24 (header → form column), so the panels sit 32 from the screen edge, 311 wide |
| page-header | breadcrumb « Accueil › Mon compte » Medium 14 muted, chevron 14, gap 8 → H1 « Mon compte » 32 Bold / 38 |
| formCol | panels gap 20; panel pad 24, r 12, border/subtle; fields 263 |
| avatar row | 80 avatar + CTA column (button md 40 + caption 14 muted, gap 8), side by side, gap 16 |
| account type | « Type de compte » row 33 tall (pad 4/0), gap 20 after Ville |
| password | « Mot de passe » over « Changer le mot de passe » (row wraps), 8 between |
| delete panel | border 2 danger/500, pad 24, gap 12 |
| footer bar | 343 at x 16, border-top, pad 20/16; dirty caption, then primary lg 48 + secondary md 40, both 311 full |

### Built in PR-2 (below sm only; route-local files)

| # | Change | File |
|---|---|---|
| 1 | Breadcrumb shown below sm (was `hidden sm:flex`) | `src/app/mon-compte/page.tsx` |
| 2 | H1 32 Bold / 38 below sm (the `sm:` 28/38 is unchanged) | same |
| 3 | Header + form column + footer buttons inset 16 (`max-sm:px-4`), header `max-sm:pt-4` (40 to the breadcrumb, as drawn) | `page.tsx`, `_components/MonCompteForm.tsx` |
| 4 | Panels gap 20 (`max-sm:gap-5`) | `MonCompteForm.tsx` |
| 5 | Avatar + CTA side by side at every width (was stacked below sm) | `_components/AvatarUploadCard.tsx` |
| 6 | « Type de compte » row without its 100 px floor below sm (`max-sm:min-h-0`) | `MonCompteForm.tsx` |
| 7 | Password row: no 100 px floor, 8 between label and button below sm | same |
| 8 | Footer bar 20 under the last panel (`max-sm:mt-5`) | same |

### Kept as built (text or logic — unchanged on purpose)

| Frame (375) | Built | Why |
|---|---|---|
| « Changer la photo » | « Choisir une photo » with no photo yet, « Changer la photo » once one exists | state-driven label |
| « JPG ou PNG, 2 Mo max » | « JPEG, PNG, WebP ou AVIF, 4 Mo max » | the real upload limits |
| Email editable, asterisk, « Un email de confirmation sera envoyé… » | read-only + « Pour modifier votre email, contactez le support. » | D10: the column grants lock email |
| Téléphone with an asterisk | no asterisk; the helper says « Requis : les clients vous contactent sur WhatsApp à ce numéro. » for a seller and « Optionnel — … » for a consumer | the #303 seller phone rule (`accountPhoneHelperKey`) |
| « Cette action est irréversible… » | « Vous pouvez demander la suppression… sous 48 h. » | deletion is a request to the team |
| custom 18 px chevron on Ville | the native select arrow | the built select |
| « 55 123 456 » | « 55123456 » | the field shows what is stored; no input formatting added |

### Verification

- Desktop 0 px, before/after at 1440 + 1100, FR + AR, seller and consumer: 8/8 identical. Each set has a 375 sentinel shot,
  and the before and after sentinels differ.
- 375 FR + AR, side by side with the frame.
- #303 rule: a seller sees « Requis : … », a consumer « Optionnel — … ». `actions.test.ts` + `account-phone-helper.test.ts`
  pass (47/47, mocked).

## 2. /recherche — PR-2b

Founder answers 2026-11-04 (the 7 questions from the PR-2 handoff):

1. Move `ProduitsFilterBar` to shared with zero behaviour change; prove /marche/produits is 0 px.
2. Ville: yes. Products by the shop's city, services by the freelancer's city; add a test.
3. Keep « Pertinence » as the default for a typed search.
4. 2 columns at 375 for /recherche only, through an optional prop on `ListingResults` (the default is unchanged).
5. Keep the icon on « Filtres ». Reuse `SearchFiltersSheet`'s optional Ville + Trier par fieldsets (#271).
6. A page-local results header using the existing keys, no new text.
7. The desktop /recherche change is allowed; before/after shots go here.
