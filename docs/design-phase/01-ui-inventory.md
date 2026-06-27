# SERVYOU UI INVENTORY — PHASE 1 STEP 1.1

**Status:** In progress
**Goal:** Capture desktop and mobile screenshots of every production page so we have a visual baseline before any redesign work begins.
**Done when:** Every page below has at least one desktop and one mobile screenshot embedded.

---

## How to capture the screenshots

The most reliable approach is Chrome's built-in full-page screenshot tool.

**For desktop captures (1440px width):**
1. Open the page in Chrome at full window width
2. Open DevTools (F12 or Cmd+Option+I)
3. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
4. Type "Capture full size screenshot" and press Enter
5. Save the PNG with the page identifier as the filename (e.g., `A1-landing-desktop.png`)

**For mobile captures (390px width — iPhone 12 Pro reference):**
1. With DevTools open, click the device toolbar icon (Cmd+Shift+M or the phone icon)
2. Set the device to "iPhone 12 Pro" or set a custom width of 390px
3. Cmd+Shift+P → "Capture full size screenshot"
4. Save with the mobile identifier (e.g., `A1-landing-mobile.png`)

Save all screenshots into `docs/design-phase/screenshots/` in the Servyou repo. Reference them in this document with relative paths.

**For authenticated pages**, log in once as the relevant role (consumer test account, shop owner test account, freelancer test account, admin account) before capturing the workspace pages for that role. Capture only what you can see in production; pages that don't exist yet get marked as "Not yet shipped" rather than skipped.

---

## Zone A — Public marketing surface (10 pages)

### A.1 — Landing page
- **URL:** `/`
- **Access:** Public
- **Desktop:** `![A.1 desktop](screenshots/A1-landing-desktop.png)`
- **Mobile:** `![A.1 mobile](screenshots/A1-landing-mobile.png)`
- **Notes:**

### A.2 — About page
- **URL:** `/a-propos`
- **Access:** Public
- **Desktop:** `![A.2 desktop](screenshots/A2-about-desktop.png)`
- **Mobile:** `![A.2 mobile](screenshots/A2-about-mobile.png)`
- **Notes:**

### A.3 — Contact page
- **URL:** `/contact`
- **Access:** Public
- **Desktop:** `![A.3 desktop](screenshots/A3-contact-desktop.png)`
- **Mobile:** `![A.3 mobile](screenshots/A3-contact-mobile.png)`
- **Notes:**

### A.4 — FAQ page
- **URL:** `/faq`
- **Access:** Public
- **Desktop:** `![A.4 desktop](screenshots/A4-faq-desktop.png)`
- **Mobile:** `![A.4 mobile](screenshots/A4-faq-mobile.png)`
- **Notes:**

### A.5 — Terms of Service
- **URL:** `/conditions-utilisation`
- **Access:** Public
- **Desktop:** `![A.5 desktop](screenshots/A5-terms-desktop.png)`
- **Mobile:** `![A.5 mobile](screenshots/A5-terms-mobile.png)`
- **Notes:**

### A.6 — Privacy Policy
- **URL:** `/politique-confidentialite`
- **Access:** Public
- **Desktop:** `![A.6 desktop](screenshots/A6-privacy-desktop.png)`
- **Mobile:** `![A.6 mobile](screenshots/A6-privacy-mobile.png)`
- **Notes:**

### A.7 — Cookie Policy
- **URL:** `/politique-cookies`
- **Access:** Public
- **Desktop:** `![A.7 desktop](screenshots/A7-cookies-desktop.png)`
- **Mobile:** `![A.7 mobile](screenshots/A7-cookies-mobile.png)`
- **Notes:**

### A.8 — Accessibility Statement
- **URL:** `/accessibilite`
- **Access:** Public
- **Desktop:** `![A.8 desktop](screenshots/A8-accessibility-desktop.png)`
- **Mobile:** `![A.8 mobile](screenshots/A8-accessibility-mobile.png)`
- **Notes:**

### A.9 — 404 Not Found
- **URL:** Visit any nonexistent URL like `/this-page-does-not-exist`
- **Access:** Public
- **Desktop:** `![A.9 desktop](screenshots/A9-404-desktop.png)`
- **Mobile:** `![A.9 mobile](screenshots/A9-404-mobile.png)`
- **Notes:**

### A.10 — 500 Server Error
- **URL:** Hard to trigger naturally; check if it exists as a custom page in the codebase
- **Access:** Public
- **Desktop:** `![A.10 desktop](screenshots/A10-500-desktop.png)`
- **Mobile:** `![A.10 mobile](screenshots/A10-500-mobile.png)`
- **Notes:**

---

## Zone B — Authentication flow (5 pages)

### B.1 — Signup page
- **URL:** `/inscription`
- **Access:** Public (logged-out only)
- **Desktop:** `![B.1 desktop](screenshots/B1-signup-desktop.png)`
- **Mobile:** `![B.1 mobile](screenshots/B1-signup-mobile.png)`
- **Notes:**

### B.2 — Signin page
- **URL:** `/login`
- **Access:** Public (logged-out only)
- **Desktop:** `![B.2 desktop](screenshots/B2-signin-desktop.png)`
- **Mobile:** `![B.2 mobile](screenshots/B2-signin-mobile.png)`
- **Notes:**

### B.3 — Email Verification confirmation
- **URL:** `/verification-email` (or similar — verify path in codebase)
- **Access:** Auth required (post-signup)
- **Desktop:** `![B.3 desktop](screenshots/B3-email-verify-desktop.png)`
- **Mobile:** `![B.3 mobile](screenshots/B3-email-verify-mobile.png)`
- **Notes:**

### B.4 — Password Reset Request
- **URL:** `/mot-de-passe-oublie`
- **Access:** Public
- **Desktop:** `![B.4 desktop](screenshots/B4-password-reset-request-desktop.png)`
- **Mobile:** `![B.4 mobile](screenshots/B4-password-reset-request-mobile.png)`
- **Notes:**

### B.5 — New Password Setup
- **URL:** `/nouveau-mot-de-passe`
- **Access:** Token-protected (from email link)
- **Desktop:** `![B.5 desktop](screenshots/B5-new-password-desktop.png)`
- **Mobile:** `![B.5 mobile](screenshots/B5-new-password-mobile.png)`
- **Notes:**

---

## Zone C — Discovery and browsing layer (3 pages)

### C.1 — Search results
- **URL:** `/recherche?q=test`
- **Access:** Public
- **Desktop:** `![C.1 desktop](screenshots/C1-search-desktop.png)`
- **Mobile:** `![C.1 mobile](screenshots/C1-search-mobile.png)`
- **Notes:**

### C.2 — Category browse page
- **URL:** `/categories/[slug]` — pick one populated category, e.g. `/categories/beaute`
- **Access:** Public
- **Desktop:** `![C.2 desktop](screenshots/C2-category-desktop.png)`
- **Mobile:** `![C.2 mobile](screenshots/C2-category-mobile.png)`
- **Notes:**

### C.3 — City filter page
- **URL:** `/villes/[ville]` — e.g. `/villes/tunis`
- **Access:** Public
- **Desktop:** `![C.3 desktop](screenshots/C3-city-desktop.png)`
- **Mobile:** `![C.3 mobile](screenshots/C3-city-mobile.png)`
- **Notes:**

---

## Zone D — Public detail pages (4 pages)

### D.1 — Product detail
- **URL:** `/produits/[id]` — pick one live product
- **Access:** Public
- **Desktop:** `![D.1 desktop](screenshots/D1-product-detail-desktop.png)`
- **Mobile:** `![D.1 mobile](screenshots/D1-product-detail-mobile.png)`
- **Notes:**

### D.2 — Service detail
- **URL:** `/services/[id]` — pick one live service
- **Access:** Public
- **Desktop:** `![D.2 desktop](screenshots/D2-service-detail-desktop.png)`
- **Mobile:** `![D.2 mobile](screenshots/D2-service-detail-mobile.png)`
- **Notes:**

### D.3 — Public shop page
- **URL:** `/boutiques/[slug]` — pick one live shop
- **Access:** Public
- **Desktop:** `![D.3 desktop](screenshots/D3-shop-desktop.png)`
- **Mobile:** `![D.3 mobile](screenshots/D3-shop-mobile.png)`
- **Notes:**

### D.4 — Public freelancer profile
- **URL:** `/freelances/[slug]` — pick one live freelancer
- **Access:** Public
- **Desktop:** `![D.4 desktop](screenshots/D4-freelancer-desktop.png)`
- **Mobile:** `![D.4 mobile](screenshots/D4-freelancer-mobile.png)`
- **Notes:**

---

## Zone E — Buyer transaction layer (4 pages)

### E.1 — Request submission form
- **URL:** Triggered from a product or service detail page via the request CTA
- **Access:** Auth required
- **Desktop:** `![E.1 desktop](screenshots/E1-request-form-desktop.png)`
- **Mobile:** `![E.1 mobile](screenshots/E1-request-form-mobile.png)`
- **Notes:**

### E.2 — Request confirmation
- **URL:** `/demande/confirmation/[id]`
- **Access:** Auth required (buyer of that order)
- **Desktop:** `![E.2 desktop](screenshots/E2-request-confirmation-desktop.png)`
- **Mobile:** `![E.2 mobile](screenshots/E2-request-confirmation-mobile.png)`
- **Notes:**

### E.3 — My Requests list
- **URL:** `/mes-demandes`
- **Access:** Auth required
- **Desktop:** `![E.3 desktop](screenshots/E3-my-requests-desktop.png)`
- **Mobile:** `![E.3 mobile](screenshots/E3-my-requests-mobile.png)`
- **Notes:**

### E.4 — My Request detail
- **URL:** `/mes-demandes/[id]`
- **Access:** Auth required (buyer of that order)
- **Desktop:** `![E.4 desktop](screenshots/E4-my-request-detail-desktop.png)`
- **Mobile:** `![E.4 mobile](screenshots/E4-my-request-detail-mobile.png)`
- **Notes:**

---

## Zone F — Buyer favorites and job posting (4 pages)

### F.1 — My Favorites
- **URL:** `/mes-favoris`
- **Access:** Auth required
- **Desktop:** `![F.1 desktop](screenshots/F1-favorites-desktop.png)`
- **Mobile:** `![F.1 mobile](screenshots/F1-favorites-mobile.png)`
- **Notes:**

### F.2 — Post a Job
- **URL:** `/publier-une-offre`
- **Access:** Auth required
- **Desktop:** `![F.2 desktop](screenshots/F2-post-job-desktop.png)`
- **Mobile:** `![F.2 mobile](screenshots/F2-post-job-mobile.png)`
- **Notes:**

### F.3 — My Job Posts list
- **URL:** `/mes-offres`
- **Access:** Auth required
- **Desktop:** `![F.3 desktop](screenshots/F3-my-job-posts-desktop.png)`
- **Mobile:** `![F.3 mobile](screenshots/F3-my-job-posts-mobile.png)`
- **Notes:**

### F.4 — My Job Post detail with responses
- **URL:** `/mes-offres/[id]`
- **Access:** Auth required (poster of that job)
- **Desktop:** `![F.4 desktop](screenshots/F4-my-job-post-detail-desktop.png)`
- **Mobile:** `![F.4 mobile](screenshots/F4-my-job-post-detail-mobile.png)`
- **Notes:**

---

## Zone G — Shop owner workspace (9 pages)

### G.1 — Become a Shop Owner
- **URL:** `/devenir-vendeur` (or wherever the shop-owner upgrade lives)
- **Access:** Auth required
- **Desktop:** `![G.1 desktop](screenshots/G1-become-shop-owner-desktop.png)`
- **Mobile:** `![G.1 mobile](screenshots/G1-become-shop-owner-mobile.png)`
- **Notes:**

### G.2 — Shop creation
- **URL:** `/ma-boutique/creer`
- **Access:** Auth required, post-upgrade
- **Desktop:** `![G.2 desktop](screenshots/G2-shop-creation-desktop.png)`
- **Mobile:** `![G.2 mobile](screenshots/G2-shop-creation-mobile.png)`
- **Notes:**

### G.3 — Shop edit
- **URL:** `/ma-boutique/modifier`
- **Access:** Auth required, shop_owner role
- **Desktop:** `![G.3 desktop](screenshots/G3-shop-edit-desktop.png)`
- **Mobile:** `![G.3 mobile](screenshots/G3-shop-edit-mobile.png)`
- **Notes:**

### G.4 — Shop owner dashboard
- **URL:** `/ma-boutique`
- **Access:** Auth required, shop_owner role
- **Desktop:** `![G.4 desktop](screenshots/G4-shop-dashboard-desktop.png)`
- **Mobile:** `![G.4 mobile](screenshots/G4-shop-dashboard-mobile.png)`
- **Notes:**

### G.5 — Products list
- **URL:** `/ma-boutique/produits`
- **Access:** Auth required, shop_owner role
- **Desktop:** `![G.5 desktop](screenshots/G5-products-list-desktop.png)`
- **Mobile:** `![G.5 mobile](screenshots/G5-products-list-mobile.png)`
- **Notes:**

### G.6 — Add product
- **URL:** `/ma-boutique/produits/ajouter`
- **Access:** Auth required, shop_owner role
- **Desktop:** `![G.6 desktop](screenshots/G6-add-product-desktop.png)`
- **Mobile:** `![G.6 mobile](screenshots/G6-add-product-mobile.png)`
- **Notes:**

### G.7 — Edit product
- **URL:** `/ma-boutique/produits/[id]/modifier`
- **Access:** Auth required, shop_owner role
- **Desktop:** `![G.7 desktop](screenshots/G7-edit-product-desktop.png)`
- **Mobile:** `![G.7 mobile](screenshots/G7-edit-product-mobile.png)`
- **Notes:**

### G.8 — Orders received list
- **URL:** `/ma-boutique/commandes`
- **Access:** Auth required, shop_owner role
- **Desktop:** `![G.8 desktop](screenshots/G8-orders-list-desktop.png)`
- **Mobile:** `![G.8 mobile](screenshots/G8-orders-list-mobile.png)`
- **Notes:**

### G.9 — Order detail (seller view)
- **URL:** `/ma-boutique/commandes/[id]`
- **Access:** Auth required, shop_owner role (seller of that order)
- **Desktop:** `![G.9 desktop](screenshots/G9-order-detail-desktop.png)`
- **Mobile:** `![G.9 mobile](screenshots/G9-order-detail-mobile.png)`
- **Notes:**

---

## Zone H — Freelancer workspace (11 pages)

### H.1 — Become a Freelancer
- **URL:** `/devenir-freelance`
- **Access:** Auth required
- **Desktop:** `![H.1 desktop](screenshots/H1-become-freelancer-desktop.png)`
- **Mobile:** `![H.1 mobile](screenshots/H1-become-freelancer-mobile.png)`
- **Notes:**

### H.2 — Profile creation
- **URL:** `/mon-profil-freelance/creer`
- **Access:** Auth required, post-upgrade
- **Desktop:** `![H.2 desktop](screenshots/H2-freelancer-profile-create-desktop.png)`
- **Mobile:** `![H.2 mobile](screenshots/H2-freelancer-profile-create-mobile.png)`
- **Notes:**

### H.3 — Profile edit
- **URL:** `/mon-profil-freelance/modifier`
- **Access:** Auth required, freelancer role
- **Desktop:** `![H.3 desktop](screenshots/H3-freelancer-profile-edit-desktop.png)`
- **Mobile:** `![H.3 mobile](screenshots/H3-freelancer-profile-edit-mobile.png)`
- **Notes:**

### H.4 — Freelancer dashboard
- **URL:** `/mon-profil-freelance`
- **Access:** Auth required, freelancer role
- **Desktop:** `![H.4 desktop](screenshots/H4-freelancer-dashboard-desktop.png)`
- **Mobile:** `![H.4 mobile](screenshots/H4-freelancer-dashboard-mobile.png)`
- **Notes:**

### H.5 — Services list
- **URL:** `/mon-profil-freelance/services`
- **Access:** Auth required, freelancer role
- **Desktop:** `![H.5 desktop](screenshots/H5-services-list-desktop.png)`
- **Mobile:** `![H.5 mobile](screenshots/H5-services-list-mobile.png)`
- **Notes:**

### H.6 — Add service
- **URL:** `/mon-profil-freelance/services/ajouter`
- **Access:** Auth required, freelancer role
- **Desktop:** `![H.6 desktop](screenshots/H6-add-service-desktop.png)`
- **Mobile:** `![H.6 mobile](screenshots/H6-add-service-mobile.png)`
- **Notes:**

### H.7 — Edit service
- **URL:** `/mon-profil-freelance/services/[id]/modifier`
- **Access:** Auth required, freelancer role
- **Desktop:** `![H.7 desktop](screenshots/H7-edit-service-desktop.png)`
- **Mobile:** `![H.7 mobile](screenshots/H7-edit-service-mobile.png)`
- **Notes:**

### H.8 — Service orders received
- **URL:** `/mon-profil-freelance/commandes`
- **Access:** Auth required, freelancer role
- **Desktop:** `![H.8 desktop](screenshots/H8-service-orders-desktop.png)`
- **Mobile:** `![H.8 mobile](screenshots/H8-service-orders-mobile.png)`
- **Notes:**

### H.9 — Job board browse
- **URL:** `/offres-emploi`
- **Access:** Auth required, freelancer role
- **Desktop:** `![H.9 desktop](screenshots/H9-job-board-desktop.png)`
- **Mobile:** `![H.9 mobile](screenshots/H9-job-board-mobile.png)`
- **Notes:**

### H.10 — Job board detail
- **URL:** `/offres-emploi/[id]`
- **Access:** Auth required, freelancer role
- **Desktop:** `![H.10 desktop](screenshots/H10-job-detail-desktop.png)`
- **Mobile:** `![H.10 mobile](screenshots/H10-job-detail-mobile.png)`
- **Notes:**

### H.11 — My Job Responses list
- **URL:** `/mon-profil-freelance/reponses`
- **Access:** Auth required, freelancer role
- **Desktop:** `![H.11 desktop](screenshots/H11-job-responses-desktop.png)`
- **Mobile:** `![H.11 mobile](screenshots/H11-job-responses-mobile.png)`
- **Notes:**

---

## Zone I — User account zone (3 pages)

### I.1 — Profile edit
- **URL:** `/mon-compte`
- **Access:** Auth required
- **Desktop:** `![I.1 desktop](screenshots/I1-profile-edit-desktop.png)`
- **Mobile:** `![I.1 mobile](screenshots/I1-profile-edit-mobile.png)`
- **Notes:**

### I.2 — Settings
- **URL:** `/parametres`
- **Access:** Auth required
- **Desktop:** `![I.2 desktop](screenshots/I2-settings-desktop.png)`
- **Mobile:** `![I.2 mobile](screenshots/I2-settings-mobile.png)`
- **Notes:**

### I.3 — Notifications inbox
- **URL:** `/notifications`
- **Access:** Auth required
- **Status:** Marked post-MVP — may not be shipped yet. If not, skip and note "Not yet shipped" below.
- **Desktop:** `![I.3 desktop](screenshots/I3-notifications-desktop.png)`
- **Mobile:** `![I.3 mobile](screenshots/I3-notifications-mobile.png)`
- **Notes:**

---

## Zone J — Administrator dashboard (8 pages)

### J.1 — Admin overview
- **URL:** `/admin`
- **Access:** Auth required, admin role
- **Desktop:** `![J.1 desktop](screenshots/J1-admin-overview-desktop.png)`
- **Mobile:** `![J.1 mobile](screenshots/J1-admin-overview-mobile.png)`
- **Notes:**

### J.2 — User management list
- **URL:** `/admin/utilisateurs`
- **Access:** Auth required, admin role
- **Desktop:** `![J.2 desktop](screenshots/J2-users-list-desktop.png)`
- **Mobile:** `![J.2 mobile](screenshots/J2-users-list-mobile.png)`
- **Notes:**

### J.3 — User detail
- **URL:** `/admin/utilisateurs/[id]`
- **Access:** Auth required, admin role
- **Desktop:** `![J.3 desktop](screenshots/J3-user-detail-desktop.png)`
- **Mobile:** `![J.3 mobile](screenshots/J3-user-detail-mobile.png)`
- **Notes:**

### J.4 — Content moderation
- **URL:** `/admin/moderation`
- **Access:** Auth required, admin role
- **Desktop:** `![J.4 desktop](screenshots/J4-moderation-desktop.png)`
- **Mobile:** `![J.4 mobile](screenshots/J4-moderation-mobile.png)`
- **Notes:**

### J.5 — Reports queue
- **URL:** `/admin/signalements`
- **Access:** Auth required, admin role
- **Desktop:** `![J.5 desktop](screenshots/J5-reports-queue-desktop.png)`
- **Mobile:** `![J.5 mobile](screenshots/J5-reports-queue-mobile.png)`
- **Notes:**

### J.6 — Report detail
- **URL:** `/admin/signalements/[id]`
- **Access:** Auth required, admin role
- **Desktop:** `![J.6 desktop](screenshots/J6-report-detail-desktop.png)`
- **Mobile:** `![J.6 mobile](screenshots/J6-report-detail-mobile.png)`
- **Notes:**

### J.7 — Disputes resolution
- **URL:** `/admin/litiges`
- **Access:** Auth required, admin role
- **Desktop:** `![J.7 desktop](screenshots/J7-disputes-desktop.png)`
- **Mobile:** `![J.7 mobile](screenshots/J7-disputes-mobile.png)`
- **Notes:**

### J.8 — Aggregate statistics
- **URL:** `/admin/statistiques`
- **Access:** Auth required, admin role
- **Desktop:** `![J.8 desktop](screenshots/J8-statistics-desktop.png)`
- **Mobile:** `![J.8 mobile](screenshots/J8-statistics-mobile.png)`
- **Notes:**

---

## Zone K — System pages (1 page)

### K.1 — Logout confirmation
- **URL:** Triggered by logout action (often a redirect, may not have its own URL)
- **Access:** Auth required
- **Desktop:** `![K.1 desktop](screenshots/K1-logout-desktop.png)`
- **Mobile:** `![K.1 mobile](screenshots/K1-logout-mobile.png)`
- **Notes:**

---

## Summary

| Zone | Page count | Captured (desktop / mobile) |
|------|------------|------------------------------|
| A — Public marketing surface | 10 | / |
| B — Authentication flow | 5 | / |
| C — Discovery and browsing | 3 | / |
| D — Public detail pages | 4 | / |
| E — Buyer transaction | 4 | / |
| F — Buyer favorites & job posting | 4 | / |
| G — Shop owner workspace | 9 | / |
| H — Freelancer workspace | 11 | / |
| I — User account zone | 3 | / |
| J — Administrator dashboard | 8 | / |
| K — System pages | 1 | / |
| **Total** | **62** | **/ 62 desktop, / 62 mobile** |

Fill in the captured counts as you go. When all 62 are done, both numbers should equal 62 and Step 1.1 closes.
