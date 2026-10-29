# Notifications: missions row + Paramètres 375 mobile (`feat/notif-missions-row`, 2026-10-29)

## Mobile frame 1488:59777 measured only for the Notifications tab
**What:** the mobile frame draws the Notifications tab. The other three tabs (Confidentialité, Langue & région, Comptes connectés) have no 375 specimen, so their panels keep their desktop padding (24) on mobile; only Notifications uses the measured 16-px sides.
**Trigger:** the three tabs get mobile frames → align their panel padding in one pass.

## The frame's breadcrumb has a third crumb (« Poterie de Nabeul »)
**What:** the mobile specimen's breadcrumb reads Accueil › Paramètres › <shop name>. It looks like a specimen artefact (the desktop frames end at « Paramètres »); not built.
**Trigger:** the founder confirms whether Paramètres should show the seller's shop in its breadcrumb.

## Missions row default differs from the specimen
**What:** the frame draws « Missions correspondant à mes compétences » OFF; migration 103's column default is ON (founder: « default true »), so the app follows the column. A profile with no row reads ON.
**Trigger:** none unless the product wants an opt-in — then the column default changes (DB agent), not this file.
