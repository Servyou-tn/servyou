# E1 « Demander un service » + E2 « Demande envoyée » — mobile 375 (`m375-e1-e2`)

Mobile batch 1, page 8 (two pages, one PR). Frames: `docs/design/m375-e1-demander-dump.json` + `.png` (375 × 1145) and
`docs/design/m375-e2-envoyee-dump.json` + `.png` (375 × 1315), both untracked. No Figma MCP read was used. Routes `/demander/[id]` and
`/demander/succes?order=…`; components `src/app/demander/[id]/_components/ServiceRequestScreen.tsx`, `ServiceRequestForm.tsx`,
`src/app/demander/succes/page.tsx`.

Both pages already had a mobile layout from their first build (frames 682:56805 / 691:57255), so this PR measures them against the new exports
and closes the gaps. Rule (as pages 4–7): the mobile shell stays (header, search, grey page); `max-lg:` overrides only. **From `lg` both pages
are unchanged**: stash + recapture against `main` on the same dev server: E1 service + product, E2 service + product, 1440 FR + AR, plus E1 / E2
service at 1100 — **0 differing pixels in all 10**.

Geometry is read from the DOM at 375 (FR + AR, scrollbar hidden) on two temporary fixture routes (deleted before commit): E1 renders the real
`ServiceRequestScreen` / `ProductRequestScreen` with the frame's content, filled the way the frame is filled; E2 is a copy of the real page with only
its auth + order read swapped for a fixture order. Both pages sit behind sign-in and E2 needs an order, so no live data was written.

## E1 — what changed, measured against the frame

| Frame node | Frame | Now (375) |
|---|---|---|
| root | gap 20, pad 16 / 16 / 32 | ✓ every block 20 apart (unchanged) |
| `breadcrumb` | « ‹ Services › Demander », 13 Regular, gap 6, chevrons 16 / 12, **16 tall** | ✓ 343 × 16 (was « Accueil › Services › Demander », 20 tall). Accueil desktop-only; « ‹ Services » has a 44 px tap target |
| `summaryCompact` | 343 × 158, pad 16, gap 12, r12, **2 px blue-600 stroke inside** | ✓ 343 × 158, text 311 wide (was 162 / 307: the CSS border sat outside the padding). Title 15 / 22 blue-800, avatar 32, name 14 Semi Bold, « · Tunis » 13 muted, « À partir de » 13 + price 20 / 26: unchanged ✓ |
| `formCard` | 343, pad 16, r12, **1 px stroke inside** | ✓ content 311 wide (was 309) |
| `heading` | 20 Semi Bold, **26** line | ✓ 26 (was 28) |
| description / timeframe / phone | labels 14 Medium, 44 fields, helpers 14 muted (21 line) | unchanged: the shared `Input` / `Textarea` primitives (helper line 20, textarea 120 tall where the frame's field hugs its 5-line specimen, 154) — see Q2 |
| `F3-budget` | label 14 Semi Bold, **17** line; 44 field; TND box 56; helper 12 | ✓ label 17 (was 20) |
| `codeNote` | 343 × 36, 12 / 18 muted | ✓ unchanged |
| `actions` | Envoyer 343 × 48 r10, **12**, Annuler 343 × 40 r10 | ✓ 12 apart (was 24: the Turnstile's injected node is a zero-height flex item between them and took a second gap). **Tab order = visual order**: « Annuler » renders once per width instead of `flex-col-reverse`, so Envoyer comes first in the DOM below `lg` (D1). The Turnstile sits in a slot above Envoyer, pulled up by the stack's gap: 0 px while invisible; with Cloudflare's always-challenge test key the widget (71) shows 8 under the note and 12 above Envoyer |

## E2 — what changed, measured against the frame

| Frame node | Frame | Now (375) |
|---|---|---|
| root | gap 24 | ✓ unchanged |
| `breadcrumb` | « ‹ Services › Confirmation », 16 tall | ✓ 343 × 16 (was « Services › Confirmation », 20 tall). « ‹ Produits » on a product order; 44 px tap target |
| `successCard` | 343 × 308, pad 32, gap 24, **2 px success stroke inside**; check 64; H1 24 / 30 blue-800; subtext 15 / 24 muted, text 279 | ✓ 343 × 308, text 279 (was 312 / 275) |
| `recapCard`, `stepsCard` | pad 24, gap 16, **1 px stroke inside** | ✓ content 295 (was 293). Recap rows, dividers, freelancer row (40 avatar, 14 / 13), description 14 / 21, meta rows; steps 42 / 63 / 63 at gap 16: unchanged ✓ |
| recap chips | **two** chips (category + « Application mobile ») | one: the order record carries the category only (as desktop) — Q3 |
| `actions` | Voir mes commandes 48, 12, Retour au marketplace 48 | ✓ unchanged |

No horizontal overflow at 375 (FR + AR, service + product, `scrollWidth` 375). Runtime: next-devtools `get_errors` with a live session on both
pages → no config or session errors.

## Every control at 375 (FR + AR)

| Page | Control | Goes to |
|---|---|---|
| E1 | ‹ Services | `/marche/services` (200) |
| E1 | Envoyer la demande | submits; an empty form stays on the page with the inline errors and « Veuillez corriger les erreurs du formulaire » / « يرجى تصحيح أخطاء النموذج. » (a valid submit goes to `/demander/succes?order=…`; not submitted — it would write an order) |
| E1 | Annuler | `/services/{id}` (200) |
| E1 | the route itself, logged out | `/connexion?next=/demander/{id}` |
| E2 | ‹ Services / ‹ Produits | `/marche/services` / `/marche/produits` (200) |
| E2 | Voir mes commandes | `/mes-commandes?tab=services` / `?tab=produits` (the buyer is signed in; a guest goes to `/connexion`) |
| E2 | Retour au marketplace | `/marche/services` / `/marche/produits` (200) |

## Questions for the founder

1. **Arabic numbers reversed (every width, so desktop AR too — not changed here, the brief keeps desktop at 0 px).**
   - E2 subtext: the phone reads « .456 123 55 216+ » in AR (should be « +216 55 123 456 »);
   - E2 recap: prices read « TND 900 » and « TND 3500 »;
   - E1 phone field: the prefix reads « 216+ ».

   Same bidi fix as the product card (#299): LTR-isolate those values. Small; it changes desktop AR on those lines only. Want it?
2. **Form primitives.** The frame's helper lines are 21 tall (ours 20) and its description field hugs its 5-line specimen (154; ours is the
   `Textarea`'s 120 and scrolls). Both are the shared `Input` / `Textarea` primitives used on every form — left as is.
3. **Recap chips.** The frame shows the service's category + a tag; the order only stores the category, so E2 shows one chip (as desktop).
4. **E1 product (« Confirmer votre demande ») has no 375 frame.** It has no overflow and every control works; its breadcrumb is still
   « Accueil › Produits › {catégorie} › {titre} › Demander » on two lines. Apply the « ‹ Produits › Demander » mobile breadcrumb there too?
5. **Phone shown unformatted.** The frame shows « 55 123 456 »; the field shows the 8 digits as stored (« 55123456 »). There is no input mask today.
