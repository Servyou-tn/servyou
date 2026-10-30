# 404 / 500 / cookie banner — measurements (A9 · A10 · A7)

Source: the architect's figma-cli bridge dumps in `docs/design/` (`a9-404-1440|375`, `a10-500-1440|375`, `a7-banner-1440|375`, `a7-modal`, each `-dump.json` + `.png`, **untracked — never staged**, Tailwind scans `docs/`). Figma MCP reads this PR: **0**. Frames: A9 `1478:35813` / `1478:35859` · A10 `1478:35837` / `1478:35890` · A7 banner `1478:35919` / mobile `1488:69171` · A7 modal `1478:35981`.

## A9 404 · A10 500 (1440 and 375)
Same shell-less centred card as the K1–K4 pages (`SystemStateScreen`): viewport `surface/subtle`; card **480** (FILL at 375, viewport px 16), pad 32, gap 24, radius `xl` 12, items centred. A9 border 1 `border/subtle`; **A10 border 2 `danger/500`** (the K3 « outlined »).

| Part | A9 · 404 | A10 · 500 |
|---|---|---|
| Lockup | S-mark 32 + « Serv » `blue/800` + « You » `blue/600`, 20 Bold, gap 8 | same |
| Icon circle | 112, `warning/100`, `icon-search-x` 64 | 112, `danger/100`, `icon-alert-triangle` 64 |
| **Eyebrow (new)** | « Erreur 404 » 15 Regular `text/muted` (h22) | « Erreur 500 · réf. 7f3a-91c2 » 15 Regular `text/muted` |
| Title | « Page introuvable » 22 Semi Bold `text/primary` | « Une erreur s’est produite de notre côté » 22 Semi Bold (2 lines at 375, h54) |
| Body | 15 Regular `text/muted`, 22 lh — « Cette page n’existe pas ou a été déplacée. Vérifiez l’adresse, ou revenez à l’accueil. » | « Nous travaillons à la résoudre. Réessayez dans un instant — si le problème continue, contactez-nous. » |
| Primary | Button primary **lg** (h48, FILL) « Retour à l’accueil » | Button primary lg « Réessayer » |
| Link | Button **link** md « Parcourir la marketplace » | Button link md « Retour à l’accueil » |

## A7 banner (card 720 at 1440 · 343 at 375)
The frame's `blue/950` is the artboard backdrop, not an overlay. Card: `surface/base`, radius **16**, three bands.

| Part | Value |
|---|---|
| Header | pad 24 24 16 24 · « Nous respectons votre vie privée » 20 Semi Bold `text/primary` (2 lines at 375) · no close button |
| Body | pad 0 24 24 24 (375: 0 16 24 16) · 15 Regular `text/muted`, 22 lh, 3 lines at 720 / 6 at 343: « Servyou utilise uniquement des cookies essentiels pour vous garder connecté, et — avec votre accord — une mesure d’audience anonyme pour améliorer le site. Aucune donnée n’est vendue. En savoir plus : Politique de cookies. » (the last two words are the link to /cookies) |
| Footer | `surface/subtle`, pad 16 24 24 24 (375: 16 16 24 16), gap 12, **end-aligned**; buttons md h40: « Personnaliser » ghost (139) · « Refuser tout » secondary (128) · « Accepter tout » primary (139). At 343 the three wrap onto two rows (frame h128) |
| 375 artboard | page px 16, pt 20, pb 32 around the card |

## A7 modal « Personnaliser » (480)
Card radius 16, `surface/base`. Header pad 24 24 16 24: « Paramètres des cookies » 20 Semi Bold + `icon-x` 20 (close). Body pad 0 24 24 24, gap 16: three **Setting Rows** (`Setting Row / control=toggle`, pad 16 0, gap 16, border `border/subtle`, label 16 Semi Bold + description 14 Regular muted, gap 2, text `pe` 40):

| Row | Description (frame) | Toggle in the frame |
|---|---|---|
| Cookies essentiels | Nécessaires pour vous garder connecté et sécuriser votre compte. Toujours actifs. | on (blue/600) |
| Mesure d’audience | Statistiques anonymes de visite pour améliorer Servyou. Désactivés par défaut. | **off** (`surface/sunken`, border `border/strong`) |
| Préférences | Retiennent votre langue et vos choix d’affichage. | on |

Footer (`surface/subtle`, pad 16 24 24 24, gap 12, end-aligned): « Refuser tout » ghost (128) · « Enregistrer mes choix » primary (201).
