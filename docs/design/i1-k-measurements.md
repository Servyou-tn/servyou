# I1 « Mon compte » + K1–K4 system pages — measurements

Figma file `jDNjJ8D1gnXiW7Ry3GkN4U`. Reads used: **4 of 4** (2026-10-27) — I1 1440 `724:63872`, I1 modal
`728:64303` (empty, see D14), K3 1440 `731:64440`, I1 375 `728:64216` (header + action stack only). K1/K2/K4
and the I1 « Type de compte » close-up are DERIVED (shared layout + the design notes), not read.

### I1 375 (`728:64216`, the only part that rendered)
mobile-header pad 16, H1 « Mon compte » Inter Semi Bold **24** (no breadcrumb at 375). `actions`: VERTICAL gap 12,
pad-x 16 pad-top 8 pad-bottom 24 — Button primary **lg** FILL « Enregistrer les modifications » FIRST, then
Button secondary md FILL « Annuler ». The panels at 375 were not in the read (D15): built FILL width, stacked.

## I1 `/mon-compte` 1440 (`724:63872`)

Shell = the existing AppShell (sidebar + 64px topbar). Content:

| Node | Value |
|---|---|
| page | VERTICAL, items centered, gap space/6 24, pad-top space/8 32, pad-bottom 40, pad-x space/8 32 |
| page-header + formCol | both **720 FIXED**, centered |
| Breadcrumb | « Accueil › Mon compte », Inter Medium 14 text/muted, chevron-right 14 |
| H1 | « Mon compte » Inter Bold 28 / lh 38, text/primary |
| formCol | VERTICAL gap 24, three panels |
| panel (1, 2) | surface/base, border/subtle 1px, radius 12, pad 24, gap 20 |
| panel heading | Inter Semi Bold 20, text/primary |
| panel 3 (danger) | surface/base, **border 2px danger/500**, radius 12, pad 24, **gap 12**; heading Semi Bold **15** danger/700; body Regular 14 text/muted; Button danger md |
| Input | **280 wide**, label Inter Medium 14/21 text/secondary (+ red `*`), field h 44, border/strong 1px, radius lg 10, pad-x 16, text Regular 16/26 text/primary; helper Regular 14/21 text/muted |
| Select | same field, 280, chevron 18 |
| avatar-row | h 100, gap 16, Avatar xl 80, Button secondary md « Changer la photo » + caption Regular 14 muted « JPG ou PNG, 2 Mo max » |
| compte-type-row | h 100, space-between, label Regular 14 text/secondary, StatusPill `freelance` (indigo/100 bg, indigo/500 text, Semi Bold 12) |
| password-row | h 100, space-between, label Medium 14 text/primary, Button secondary md « Changer le mot de passe »; Divider (border/subtle, 320) above |
| footer-bar | surface/base, border-t border/subtle, pad-x 240 pad-y 20, space-between; left: 8px warning/500 dot + « Modifications non enregistrées » Medium 14/21 muted; right gap 12: secondary md « Annuler » + primary **lg** (48) « Enregistrer les modifications » |

Panel 1 « Profil »: avatar-row, Nom complet*, Ville, Type de compte. Panel 2 « Connexion & sécurité »: Email*,
Téléphone* (+216 prefix field), divider, Mot de passe row. Panel 3: « Supprimer mon compte ».

### Frame vs rulings (numbered, continues the brief's D-numbering)
- **D10 — Email** is drawn editable with « Un email de confirmation sera envoyé… ». Architect ruling 2: read-only +
  « contactez le support » (existing `monCompte.field.emailHelp`). Built read-only.
- **D11 — Delete copy** is drawn « Cette action est irréversible. Vos annonces, commandes et messages seront
  définitivement supprimés. » Ruling 4 forbids it (deletion is a request). Built with the honest copy.
- **D12 — Phone `*`** (required) vs the DB/action (phone optional, null allowed). Built optional, no `*`.
- **D13 — Phone panel**: Figma puts Téléphone in « Connexion & sécurité »; kept there.
- **D14 — Delete modal frame `728:64303` is empty** (scrim fills only; the card did not render in the read, and
  it was not worth the last read). The modal is built from the H7 typed-confirm precedent
  (`DeleteProductModal`) with ruling-4 copy, tokens only. Flagged for the founder gate.
- **D15 — Mobile 375** (`728:64216`) not read: panels FILL 343, stacked actions, password row stacked
  (per the design notes). Footer bar mirrors I2's.

## K system pages (K3 read; K1/K2/K4 derived)

Shell-less. Viewport FIXED (1440×900 / 375×812), surface/subtle, content centered both axes.

| Node | Value |
|---|---|
| card | surface/base, border/subtle 1px (**K3: 2px danger/500**), radius 12, pad 32, gap 24, items centered; **480** desktop / FILL (343) mobile |
| Lockup | S-mark 32 + « Serv » blue/800 + « You » blue/600, Inter Bold 20, gap 8 |
| iconCircle | **112**, radius full, tint/100 bg; icon **64** |
| H1 | Inter Semi Bold 22, text/primary, centered |
| body | Inter Regular 15 / lh 22, text/muted, centered |
| CTA | Button primary **lg** (48), FILL width |
| link | Button link md (blue/600 Semi Bold 16), h 40 |

| Page | Icon / tint | H1 | Body | CTA | Link |
|---|---|---|---|---|---|
| K1 `/a-bientot` | check-circle blue/600 on blue/100 | À bientôt ! | (derived) | Se reconnecter → /connexion | Retour à l'accueil → / |
| K2 `/session-expiree` | clock warning/500 on warning/100 | Votre session a expiré | (derived) | Se reconnecter → /connexion?next= | Retour à l'accueil |
| K3 `/compte-suspendu` | alert-triangle danger/500 on danger/100, **card 2px danger/500** | Votre compte est suspendu | « L’accès à votre compte a été suspendu. Si vous pensez qu’il s’agit d’une erreur, contactez notre support. » | Contacter le support → /contact (D16: frame says support; `/aide` is login-gated) | Se déconnecter |
| K4 `/maintenance` | settings indigo/500 on indigo/100 | …en maintenance | (derived) | **secondary** « Réessayer », no link | muted Facebook line below the card (derived, omitted if no URL is known: D17) |
