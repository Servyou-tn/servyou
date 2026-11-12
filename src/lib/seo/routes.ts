// Which pages search engines may index (audit checklist 5). robots.ts, sitemap.ts and the tests read these lists,
// so a page is public or private in exactly one place.
//
// Every page is noindex by default (the root layout's robots); a PUBLIC page opts in through publicMetadata()
// (src/lib/seo/metadata.ts). A new page therefore stays out of search engines until someone decides it is public.

/** The public pages with a fixed address, in sitemap order. Detail pages and categories are added from the database. */
export const PUBLIC_STATIC_PATHS = [
  '/',
  '/marche/services',
  '/marche/produits',
  '/devenir-vendeur',
  '/devenir-vendeur/freelance',
  '/devenir-vendeur/boutique',
  '/a-propos',
  '/faq',
  '/contact',
  '/conditions',
  '/confidentialite',
  '/cookies',
  '/accessibilite',
] as const

/** The public page FILES (src/app/…/page.tsx) that must call publicMetadata — checked by seo-routes.test.ts. */
export const PUBLIC_PAGE_FILES = [
  'page.tsx',
  'marche/services/page.tsx',
  'marche/produits/page.tsx',
  'devenir-vendeur/page.tsx',
  'devenir-vendeur/freelance/page.tsx',
  'devenir-vendeur/boutique/page.tsx',
  '(marketing)/a-propos/page.tsx',
  '(marketing)/faq/page.tsx',
  '(marketing)/contact/page.tsx',
  '(marketing)/conditions/page.tsx',
  '(marketing)/confidentialite/page.tsx',
  '(marketing)/cookies/page.tsx',
  '(marketing)/accessibilite/page.tsx',
  'categories/[slug]/page.tsx',
  'freelance/[id]/page.tsx',
  'boutique/[id]/page.tsx',
  'produits/[id]/page.tsx',
  'services/[id]/page.tsx',
] as const

/**
 * Routes that are neither public pages nor private areas: crawlers may visit them, but they never reach the index.
 * seo.test.ts: every src/app page must be in PUBLIC_PAGE_FILES, here, under AUTH_NOINDEX_PREFIXES or under a
 * DISALLOWED_PREFIXES entry.
 */
export const OPEN_NOINDEX_PATHS = [
  '/marche', // redirects to /marche/services or /marche/produits
  '/devenir-freelance', // 308 to /devenir-vendeur/freelance
  '/recherche', // search results: crawlable for their links, noindex (near-duplicates of the listings)
] as const

/**
 * The sign-in, sign-up, password and email-verification pages (founder ruling 2026-11-12, PR #362): NOT disallowed in
 * robots.txt, so crawlers can read their noindex (the root default). A page blocked in robots.txt cannot show its
 * noindex, and could still appear in results as a bare link. Each prefix covers its sub-pages (/inscription/consumer…).
 */
export const AUTH_NOINDEX_PREFIXES = [
  '/connexion',
  '/inscription',
  '/mot-de-passe-oublie',
  '/nouveau-mot-de-passe',
  '/verifier-email',
] as const

/**
 * Private areas crawlers must not visit: signed-in spaces, admin, account flows, auth pages, API and preview pages.
 * robots.txt rules match by PREFIX (« /mes- » covers /mes-commandes, /mes-services…), so none of these may be a
 * prefix of a public path — seo-routes.test.ts checks it.
 */
export const DISALLOWED_PREFIXES = [
  // signed-in spaces
  '/tableau-de-bord', // + /tableau-de-bord-vendeur
  '/mon-', // /mon-compte, /mon-profil-freelance
  '/mes-', // /mes-annonces, /mes-commandes, /mes-engagements, /mes-favoris, /mes-produits, /mes-propositions, /mes-services
  '/ma-boutique',
  '/commandes-recues',
  '/statistiques',
  '/parametres',
  '/profil',
  '/missions',
  '/trouver-des-missions',
  '/demander',
  '/aide', // the help centre needs a session (it redirects visitors to /connexion)
  '/admin',
  // account-state pages (the sign-in / sign-up / password pages are in AUTH_NOINDEX_PREFIXES: crawlable, noindex)
  '/session-expiree',
  '/compte-suspendu',
  '/a-bientot',
  '/maintenance',
  '/auth/',
  // machinery and preview-only pages
  '/api/',
  '/monitoring',
  '/design-tokens-verification',
] as const
