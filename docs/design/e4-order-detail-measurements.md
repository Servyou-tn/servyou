# E4 — « Détail de ma commande » (`/mes-commandes/[id]`) — measurements

Read with `fig.mjs dump|png` (no MCP reads spent), 2026-10-29. Frames: 1469:23519 Arrivée (main) · 1472:23919 En attente ·
1472:24760 Reçue · 1472:25035 Annulée · 1475:25384 Service (4 steps) · 1475:25872 mobile 375 · 1475:25765 cancel modal ·
1475:25807 « Signaler un problème » modal. All measured from the dumps; nothing is from memory.

## Page spine (1440)

| Node | Value |
|---|---|
| content | 1200 wide, pad 32, gap 32 → inner 1136 |
| topGroup | gap 24: header (gap 12) + stepper panel |
| titleRow | space-between: `Commande #A4F729` 32 Bold text-primary + StatusPill (gap 12) · « Passée le 18 juillet 2026 » 14 Regular text-secondary |
| breadcrumb | « Mes commandes › Commande #A4F729 » |
| stepper panel | surface/base · border/subtle · r12 · pad 24 · stepper 904 wide |
| twoCol | gap 24: main **752** (gap 16) + rail **360** (gap 16) |
| every panel | surface/base · border/subtle 1px · r12 · pad 24 · gap 16 · title 20 Semi Bold text-primary |

## Stepper (Order Stepper — new component set, `Step Node` / `Step Circle`)

| Part | Horizontal (≥ lg) | Vertical (mobile 375) |
|---|---|---|
| circle | 32 · completed blue/600 + check 16 · current: surface/base, 2px blue/600 ring + dot · upcoming: surface/base, 1.5px border/strong | same |
| **cancelled** | circle **danger/500 + × 16**, label **danger/500 14 Semi Bold « Annulée »**; it REPLACES the stage after the last reached one; every connector is border/strong; later stages upcoming | – |
| connector | 109 × 2; **blue/600 behind a completed stage**, border/strong otherwise (E3/G9's rail uses border-strong for completed — see decision D1) | 2 × 26, same colours |
| label | **14** Medium text-primary (completed) · 14 Semi Bold blue/600 (current) · 14 Medium text-muted (upcoming) | same, beside the circle |
| date | layer exists but **hidden** on desktop | **visible**: 12 Medium text-muted under the label (« 18 juil. »); absent when no event |
| node | gap 4, width hug | – |

## Panels

| Panel | Content (measured) |
|---|---|
| **Le produit** | thumb 28×80 (r8, surface/sunken, border/subtle) · info gap 4: title 16 Semi Bold · « Quantité : n » 14 secondary · « Prix unitaire : n TND » 14 muted · breakdown gap 8: « Produit (× n) » / « Livraison » 16 Regular (secondary / primary), divider, **Total 16 Bold** · COD note 14 muted « Paiement à la livraison — vous payez à la réception du colis. » |
| **Vendeur / Freelance** (rail) | name 16 Semi Bold · « Boutique · Tunis » 14 muted · « Téléphone » 14 muted + number 16 Regular + disclosure 12 Medium muted « Coordonnées visibles car vous avez une commande avec cette boutique. » · WhatsApp Button **lg** (48, wa/brand, label 16 Semi Bold text-primary) « Contacter la boutique » |
| **Livraison** (product) | « Destinataire » / « Adresse » / « Ville » = 14 muted label over 16 Regular value (gap 4) · « VOTRE NOTE » callout (12 uppercase muted + « … » 14), start border blue, surface/subtle |
| **Suivi de livraison** (product, not cancelled) | « Société de livraison » + « Numéro de suivi », same label/value; before shipping the values read « Choisie par la boutique à l'expédition » / « Disponible dès l'expédition » |
| **Historique de la commande** | dot 10 blue/600 + « label · dd/mm hhmm » 14; a 2px line through the dots |
| **Action panel** (rail) | title 20 Semi Bold + Button lg ×2 (primary 48 / secondary 48, 16 Semi Bold) + helper 14 secondary; a hidden `Annuler la commande` 14 Regular **danger/500** link, 312 wide, sits at the foot (shown for non-pending states, see D4) |
| **Service variant** | « Le service » (title · « Formule » · « Délai annoncé » · single « Service » price row · Total · « Paiement directement au freelance, à la remise du travail. ») · « Freelance » rail panel · **« Votre demande »** (« Votre besoin » / « Délai souhaité » / « Ville ») · no Livraison, no Suivi · Historique (« Demande envoyée », « Acceptée par le freelance », « Travail livré par le freelance ») |

## State → action panel (rail)

| Status | Title | Controls |
|---|---|---|
| En attente (product) | « En attente de la boutique » | **danger** « Annuler la commande » (full-width button) + helper « … Vous pouvez l'annuler gratuitement tant qu'elle est en attente. » |
| Arrivée | « Votre colis est arrivé ? » | primary « Confirmer la réception » + secondary « Signaler un problème » + helper |
| Reçue | « Commande terminée » | secondary « Signaler un problème » + « Vous avez confirmé la réception le … » |
| Annulée | « Commande annulée » | none — « Vous avez annulé cette commande le … Aucun paiement n'a été demandé. » |
| Service livré (arrived) | « Le travail est livré ? » | primary « Confirmer la réception » + secondary « Signaler un problème » |

## Modals (480 wide, r16, header pad 24/24/16/24, body gap 16, footer surface/subtle pad 16/24/24/24)

| Modal | Content |
|---|---|
| Annuler cette commande ? (1475:25765) | title 20 Semi Bold + ×; select « Motif de l'annulation » `*`; textarea « Précisions (optionnel) » « Ajoutez un mot pour la boutique… » (120 tall); footer ghost « Retour » + danger « Confirmer l'annulation » |
| Signaler un problème (1475:25807) | title + ×; select « Nature du problème » `*`; textarea « Décrivez le problème » `*` « Expliquez ce qui ne va pas : article différent, abîmé, non reçu, travail incomplet… »; footer ghost « Annuler » + **primary** « Envoyer le signalement » |

## Mobile 375 (1475:25872)

page pad 16 / gap 16 · H1 **22 Semi Bold** · pill · date · **vertical stepper** panel (pad 24) · **action panel moves up, right after the stepper** ·
then Le produit → Vendeur → Livraison → Suivi → Historique (single column).
