# B5 — Paramètres › Notifications (measurements)

Frames read with `fig.mjs dump` (no MCP reads): **424:17442** (freelancer, « état par défaut sauvegardé »), **558:38878** (shop_owner),
toast **424:17492** and footer **558:38900** (both built in B1 and reused unchanged). The 375 mobile frame was not read — its node id was
not available (see PR decision D6).

| Part | Value |
|---|---|
| settings-content | 720 wide, gap 24: `panel-emails` then `panel-platform` |
| panel-emails | surface/base · border/subtle · r12 · pad 24 · gap 8 · title « E-mails » 20 Semi Bold text-primary · line 14 text-secondary (2 lines) |
| email-rows | pad-top 16; Setting Row 672×87 (label 16 Semi Bold text-primary · description 14 text-muted, 2 lines · pe 40) + 1px border/subtle divider |
| toggle | 44×24 track, blue/600 when on, surface/sunken + border/strong when off, 20 knob |
| security row | lock icon 16 + toggle, ON, disabled (control 68×24); no column behind it |
| panel-platform | surface/subtle · border/subtle · r12 · pad 24 · gap 8 · « Notifications sur la plateforme » 20 Semi Bold text-secondary + Badge « Bientôt disponible » |

## Rows per frame
| Row | shop_owner (558) | freelancer (424) | column |
|---|---|---|---|
| Nouvelles commandes reçues | ✓ (boutique) | ✓ (« vos services ») | `email_new_orders` (default on) |
| Propositions reçues sur mes annonces | ✓ | ✓ | `email_proposals` (on) |
| Nouveaux avis clients | ✓ (boutique) | ✓ (profil) | `email_reviews` (on) |
| Alertes de sécurité | locked ON | locked ON | — |
| Alerte stock faible | ✓ | — | `email_low_stock` (off) |
| Missions correspondant à mes compétences | — | ✓ (off) | **none** — not rendered (D2) |
| Newsletter et actualités Servyou | ✓ | ✓ | `email_newsletter` (off) |
