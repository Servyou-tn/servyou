import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter } from 'next/font/google'

/*
 * DISPOSABLE DESIGN-PHASE PROTOTYPE — /preview/landing-v1
 * ------------------------------------------------------
 * Built per the A.1 spec in docs/servyou-pages-elements-and-interactions.md
 * with the working brand colours locked for this prototype only (Phase 2 of
 * the design-phase build plan will formalise the real palette/tokens).
 *
 * Isolation discipline (see the PR brief):
 *   - Self-contained route. No shared components, no edits to the root layout,
 *     no additions to globals.css's @theme block.
 *   - All working brand colours are local CSS variables (--landing-v1-*) and
 *     all helper classes are prefixed landing-v1-, defined in the scoped
 *     <style> block below so nothing leaks into the rest of the codebase.
 *   - Pure server component: the FAQ accordion and the mobile menu both use
 *     native <details>/<summary>, so there is zero client hydration.
 *
 * Deliberate deviation from the brief, noted in the PR description: the brief
 * asked for a header that is "transparent over hero, solid on scroll", but a
 * scroll-triggered restyle needs a client-side scroll listener. To stay a pure
 * server component, this prototype ships a permanent glass / backdrop-blur
 * sticky header instead. The scroll refinement belongs to the real Phase 6
 * landing page.
 *
 * Icons are inlined Lucide SVG paths (MIT-licensed) rather than the
 * lucide-react package, which is not installed in this project — this keeps
 * the identical Lucide look while honouring the "no new npm packages" rule.
 */

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Servyou — Aperçu (landing v1)',
  description: "Prototype de page d'accueil pour la phase de design de Servyou.",
}

/* ----------------------------------------------------------------------------
 * Inlined Lucide icons (MIT). Decorative by default (aria-hidden).
 * -------------------------------------------------------------------------- */
function Lucide({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const IconMapPin = ({ className }: { className?: string }) => (
  <Lucide className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Lucide>
)

const IconWallet = ({ className }: { className?: string }) => (
  <Lucide className={className}>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </Lucide>
)

const IconShield = ({ className }: { className?: string }) => (
  <Lucide className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Lucide>
)

const IconInstagram = ({ className }: { className?: string }) => (
  <Lucide className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </Lucide>
)

const IconFacebook = ({ className }: { className?: string }) => (
  <Lucide className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </Lucide>
)

const IconChevronDown = ({ className }: { className?: string }) => (
  <Lucide className={className}>
    <path d="m6 9 6 6 6-6" />
  </Lucide>
)

const IconMenu = ({ className }: { className?: string }) => (
  <Lucide className={className}>
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </Lucide>
)

const IconX = ({ className }: { className?: string }) => (
  <Lucide className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Lucide>
)

/* ----------------------------------------------------------------------------
 * Content (all copy in French, routed through JS so apostrophes don't trip
 * react/no-unescaped-entities).
 * -------------------------------------------------------------------------- */
const NAV_LINKS = [
  { label: 'Accueil', href: '#top' },
  { label: 'Boutiques', href: '#' },
  { label: 'Freelances', href: '#' },
  { label: "Offres d'emploi", href: '#' },
  { label: 'À propos', href: '#' },
]

const HERO = {
  headline: "Une vraie maison pour l'économie tunisienne",
  subhead:
    'Achetez, vendez, et travaillez en dinars tunisiens. Paiement à la livraison, services en français et en arabe, vos données hébergées en Europe.',
  primaryCta: 'Créer un compte gratuit',
  secondaryCta: 'Découvrir la plateforme',
  trust: [
    '24 gouvernorats servis',
    '14 catégories',
    '0% de commission au lancement',
    'Données hébergées en Europe',
  ],
}

const BENEFITS = [
  {
    Icon: IconMapPin,
    title: "Tunisien d'abord",
    body: 'Conçu pour la Tunisie. Tous les prix en dinars, livraison dans les 24 gouvernorats, paiement à la livraison universel.',
  },
  {
    Icon: IconWallet,
    title: 'Honnête sur les prix',
    body: "Pas de commission cachée. Pas de frais surprise. Ce que vous voyez, c'est ce que vous payez.",
  },
  {
    Icon: IconShield,
    title: 'Vos données, votre maison',
    body: 'Vos informations restent en Europe, jamais revendues. Pas de pisteurs tiers, pas de publicités ciblées.',
  },
]

const JOURNEYS = [
  {
    title: 'Pour les acheteurs',
    body: "Découvrez des produits et services tunisiens, demandez en un clic, payez à la livraison. Suivez votre commande à travers les huit étapes du cycle de vie, depuis la demande jusqu'à la réception.",
    badge: 'Acheteurs',
  },
  {
    title: 'Pour les boutiques',
    body: 'Créez votre boutique en cinq minutes, listez vos produits, partagez le lien sur Instagram et WhatsApp. Recevez et gérez vos commandes depuis un tableau de bord conçu pour les vendeurs tunisiens.',
    badge: 'Boutiques',
  },
  {
    title: 'Pour les freelances',
    body: "Construisez votre profil professionnel, listez vos services, parcourez le tableau d'offres d'emploi. Répondez aux demandes des clients qui ont besoin de vos compétences.",
    badge: 'Freelances',
  },
]

const STEPS = [
  { n: '01', title: 'Trouvez', body: 'Parcourez les boutiques et les freelances tunisiens.' },
  { n: '02', title: 'Demandez', body: 'Soumettez une demande gratuite, sans engagement.' },
  { n: '03', title: 'Recevez', body: 'Le vendeur vous contacte et organise la livraison.' },
  { n: '04', title: 'Payez', body: 'À la livraison, en dinars, sans intermédiaire.' },
]

const FAQS = [
  {
    q: "Comment Servyou empêche-t-il les arnaques ?",
    a: "Tous les vendeurs sont vérifiés à l'inscription. Les acheteurs peuvent signaler tout problème, et notre équipe agit dans les 48 heures. Le paiement à la livraison vous protège : vous payez uniquement quand vous recevez.",
  },
  {
    q: "Et si le produit livré n'est pas ce que j'ai commandé ?",
    a: "Vous pouvez refuser la livraison. Aucun paiement n'est exigé tant que vous n'avez pas confirmé la réception.",
  },
  {
    q: 'Servyou prend-il une commission ?',
    a: 'Non. Au lancement, Servyou est gratuit pour tous — acheteurs, boutiques, et freelances. Les frais futurs seront annoncés clairement, jamais en surprise.',
  },
  {
    q: 'Mes données sont-elles vendues à des tiers ?',
    a: "Jamais. Vos données restent hébergées en Europe et ne sont partagées qu'avec les vendeurs avec qui vous interagissez directement.",
  },
  {
    q: 'Pourquoi français et arabe, mais pas anglais ?',
    a: "Servyou est conçu pour les Tunisiens d'abord. Le français et l'arabe couvrent l'usage quotidien. L'anglais arrivera plus tard si la communauté le demande.",
  },
]

const FOOTER_COLS = [
  {
    title: 'Découvrir',
    links: [
      { label: 'Boutiques', href: '#' },
      { label: 'Freelances', href: '#' },
      { label: "Offres d'emploi", href: '#' },
      { label: 'Catégories', href: '#' },
    ],
  },
  {
    title: 'Servyou',
    links: [
      { label: 'À propos', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: "Conditions d'utilisation", href: '#' },
      { label: 'Confidentialité', href: '#' },
      { label: 'Cookies', href: '#' },
      { label: 'Accessibilité', href: '#' },
    ],
  },
]

const CLOSING_LINE =
  'Tunis mérite une vraie place du marché. Nous la construisons. Rejoignez-nous.'
const TAGLINE = "Une vraie maison pour l'économie tunisienne"
const COPYRIGHT = '© 2026 Servyou. Tous droits réservés.'

/* ----------------------------------------------------------------------------
 * Local presentational pieces (route-scoped, not shared components).
 * -------------------------------------------------------------------------- */
function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={`font-bold tracking-tight ${className ?? ''}`}
      role="img"
      aria-label="Servyou"
    >
      <span className="text-[var(--landing-v1-primary-dark)]">Serv</span>
      <span className="text-[var(--landing-v1-primary-bright)]">you</span>
    </span>
  )
}

function LangToggle({ className }: { className?: string }) {
  // Visual only — no functionality (per brief).
  return (
    <div
      role="group"
      aria-label="Choisir la langue (aperçu, non fonctionnel)"
      className={`inline-flex items-center rounded-full border border-[var(--landing-v1-border)] p-0.5 text-xs font-medium ${className ?? ''}`}
    >
      <span
        aria-current="true"
        className="rounded-full bg-[var(--landing-v1-primary-bright)] px-2.5 py-1 text-white"
      >
        FR
      </span>
      <span className="px-2.5 py-1 text-[var(--landing-v1-muted)]">AR</span>
    </div>
  )
}

// A soft mock card used in the hero composition. Decorative.
function HeroVisual() {
  return (
    <div
      className="landing-v1-hero-visual relative overflow-hidden rounded-3xl p-5 shadow-xl sm:p-7"
      aria-hidden="true"
    >
      {/* large faint logo watermark */}
      <div className="pointer-events-none absolute -right-6 -top-6 select-none text-7xl font-bold text-white/10">
        S
      </div>

      <div className="relative flex flex-col gap-4">
        {/* Mock product card */}
        <div className="-rotate-1 rounded-2xl bg-white p-3 shadow-lg">
          <div className="mb-2 h-20 rounded-lg bg-[var(--landing-v1-subtle)]" />
          <p className="text-sm font-semibold text-[var(--landing-v1-text)]">
            Sac en cuir artisanal
          </p>
          <p className="text-sm font-bold text-[var(--landing-v1-primary-bright)]">45,00 TND</p>
          <p className="text-xs text-[var(--landing-v1-muted)]">Boutique Aziz · Tunis</p>
        </div>

        <div className="flex gap-4">
          {/* Mock service card */}
          <div className="flex-1 rotate-1 rounded-2xl bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--landing-v1-primary-light)] text-xs font-bold text-[var(--landing-v1-primary-dark)]">
                SK
              </span>
              <span className="text-xs font-semibold text-[var(--landing-v1-text)]">
                Sami K.
              </span>
            </div>
            <p className="text-sm font-semibold text-[var(--landing-v1-text)]">Design de logo</p>
            <p className="text-xs text-[var(--landing-v1-muted)]">À partir de 80,00 TND</p>
          </div>

          {/* Mock order lifecycle stepper */}
          <div className="flex-1 rounded-2xl bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-semibold text-[var(--landing-v1-text)]">
              Commande #1042
            </p>
            <ol className="flex flex-col gap-1.5">
              {['Demande', 'Acceptée', 'Expédiée', 'Reçue'].map((label, i) => (
                <li key={label} className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      i <= 1
                        ? 'bg-[var(--landing-v1-success)]'
                        : 'bg-[var(--landing-v1-border)]'
                    }`}
                  />
                  <span
                    className={`text-[11px] ${
                      i <= 1
                        ? 'font-medium text-[var(--landing-v1-text)]'
                        : 'text-[var(--landing-v1-muted)]'
                    }`}
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mock "screenshot" placeholder for the journey sections. Decorative.
function JourneyMock({ badge }: { badge: string }) {
  return (
    <div
      className="rounded-2xl border border-[var(--landing-v1-border)] bg-white p-4 shadow-md"
      aria-hidden="true"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center rounded-full bg-[var(--landing-v1-primary-light)]/30 px-2.5 py-1 text-xs font-semibold text-[var(--landing-v1-primary-dark)]">
          {badge}
        </span>
        <span className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--landing-v1-border)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--landing-v1-border)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--landing-v1-border)]" />
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-24 rounded-lg bg-[var(--landing-v1-subtle)]" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-14 rounded-lg bg-[var(--landing-v1-subtle)]" />
          <div className="h-14 rounded-lg bg-[var(--landing-v1-subtle)]" />
        </div>
        <div className="h-3 w-2/3 rounded bg-[var(--landing-v1-border)]" />
        <div className="h-3 w-1/2 rounded bg-[var(--landing-v1-border)]" />
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Page
 * -------------------------------------------------------------------------- */
const PRIMARY_BTN =
  'inline-flex items-center justify-center rounded-xl bg-[var(--landing-v1-primary-bright)] px-6 font-semibold text-white shadow-sm transition-colors hover:bg-[var(--landing-v1-primary-dark)] focus-visible:outline-none'
const GHOST_BTN =
  'inline-flex items-center justify-center rounded-xl px-6 font-semibold text-[var(--landing-v1-primary-dark)] transition-colors hover:bg-[var(--landing-v1-subtle)] focus-visible:outline-none'

export default function LandingV1Page() {
  return (
    <div
      className={`landing-v1-root ${inter.className} min-h-screen bg-[var(--landing-v1-surface)] text-[var(--landing-v1-text)] antialiased`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
.landing-v1-root {
  --landing-v1-primary-dark: #1E3A8A;
  --landing-v1-primary-bright: #2563EB;
  --landing-v1-primary-light: #7DAEED;
  --landing-v1-text: #0F172A;
  --landing-v1-muted: #64748B;
  --landing-v1-border: #E2E8F0;
  --landing-v1-surface: #FFFFFF;
  --landing-v1-subtle: #F8FAFC;
  --landing-v1-surface-blur: rgba(255, 255, 255, 0.82);
  --landing-v1-success: #10B981;
  --landing-v1-warning: #F59E0B;
  --landing-v1-danger: #EF4444;
}

/* Guaranteed visible focus ring (primary bright, 2px) on every focusable element. */
.landing-v1-root :focus-visible {
  outline: 2px solid var(--landing-v1-primary-bright);
  outline-offset: 2px;
  border-radius: 6px;
}

/* Section gradients keep colour out of inline styles. */
.landing-v1-hero-bg {
  background: linear-gradient(180deg, var(--landing-v1-subtle) 0%, var(--landing-v1-surface) 100%);
}
.landing-v1-hero-visual {
  background: linear-gradient(135deg, var(--landing-v1-primary-dark) 0%, var(--landing-v1-primary-bright) 100%);
}

/* FAQ accordion: drop the native marker, animate the chevron. */
.landing-v1-faq > summary { list-style: none; }
.landing-v1-faq > summary::-webkit-details-marker { display: none; }
.landing-v1-chevron { transition: transform 200ms ease; }
.landing-v1-faq[open] .landing-v1-chevron { transform: rotate(180deg); }

/* Mobile menu: native <details> overlay, icon swaps on open. */
.landing-v1-mobile > summary { list-style: none; }
.landing-v1-mobile > summary::-webkit-details-marker { display: none; }
.landing-v1-mobile .landing-v1-icon-close { display: none; }
.landing-v1-mobile[open] .landing-v1-icon-menu { display: none; }
.landing-v1-mobile[open] .landing-v1-icon-close { display: inline-flex; }

@media (prefers-reduced-motion: reduce) {
  .landing-v1-root *,
  .landing-v1-root *::before,
  .landing-v1-root *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`,
        }}
      />

      {/* ===================== HEADER ===================== */}
      <header className="sticky top-0 z-40 border-b border-[var(--landing-v1-border)] bg-[var(--landing-v1-surface-blur)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#top" className="rounded-md" aria-label="Servyou — accueil">
            <LogoWordmark className="text-xl" />
          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="Navigation principale">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-medium text-[var(--landing-v1-muted)] transition-colors hover:text-[var(--landing-v1-text)]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 md:flex">
            <LangToggle />
            <Link href="/login" className={`${GHOST_BTN} h-10 text-sm`}>
              Se connecter
            </Link>
            <Link href="/signup" className={`${PRIMARY_BTN} h-10 text-sm`}>
              S&apos;inscrire
            </Link>
          </div>

          {/* Mobile menu (native details, no JS) */}
          <details className="landing-v1-mobile md:hidden">
            <summary
              aria-label="Ouvrir le menu"
              className="relative z-[60] inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--landing-v1-text)] hover:bg-[var(--landing-v1-subtle)]"
            >
              <IconMenu className="landing-v1-icon-menu" />
              <IconX className="landing-v1-icon-close" />
            </summary>
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-1 bg-[var(--landing-v1-surface)] px-6">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="flex min-h-12 w-full max-w-xs items-center justify-center rounded-lg text-lg font-medium text-[var(--landing-v1-text)] hover:bg-[var(--landing-v1-subtle)]"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
                <Link href="/login" className={`${GHOST_BTN} h-12 w-full border border-[var(--landing-v1-border)]`}>
                  Se connecter
                </Link>
                <Link href="/signup" className={`${PRIMARY_BTN} h-12 w-full`}>
                  S&apos;inscrire
                </Link>
                <div className="mt-2 flex justify-center">
                  <LangToggle />
                </div>
              </div>
            </div>
          </details>
        </div>
      </header>

      <main id="top">
        {/* ===================== HERO ===================== */}
        <section className="landing-v1-hero-bg">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                {HERO.headline}
              </h1>
              <p className="max-w-[480px] text-base text-[var(--landing-v1-muted)] md:text-xl">
                {HERO.subhead}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className={`${PRIMARY_BTN} h-14 text-base`}>
                  {HERO.primaryCta}
                </Link>
                <a href="#benefits" className={`${GHOST_BTN} h-14 border border-[var(--landing-v1-border)] text-base`}>
                  {HERO.secondaryCta}
                </a>
              </div>
            </div>

            {/* DOM order (text → visual) gives the correct layout at both breakpoints:
                mobile stacks headline/sub/CTA first then the visual below (CTA stays
                within the first screen height); desktop puts text left, visual right. */}
            <div>
              <HeroVisual />
            </div>
          </div>

          {/* Trust band */}
          <div className="border-t border-[var(--landing-v1-border)] bg-[var(--landing-v1-surface)]/60">
            <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 text-xs font-medium text-[var(--landing-v1-muted)] sm:px-6 md:text-sm">
              {HERO.trust.map((item, i) => (
                <li key={item} className="flex items-center gap-6">
                  {i > 0 && <span aria-hidden="true" className="hidden text-[var(--landing-v1-border)] sm:inline">·</span>}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===================== BENEFITS ===================== */}
        <section id="benefits" className="scroll-mt-20 bg-[var(--landing-v1-surface)] py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="mb-3 text-center text-3xl font-bold md:text-4xl">Pourquoi Servyou ?</h2>
            <p className="mx-auto mb-12 max-w-xl text-center text-[var(--landing-v1-muted)]">
              Une plateforme construite pour la réalité tunisienne, sans surprise et sans
              compromis sur la confiance.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              {BENEFITS.map(({ Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-[var(--landing-v1-border)] bg-[var(--landing-v1-surface)] p-6 shadow-sm"
                >
                  <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--landing-v1-primary-light)]/25 text-[var(--landing-v1-primary-dark)]">
                    <Icon />
                  </span>
                  <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--landing-v1-muted)]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== JOURNEYS ===================== */}
        <section className="bg-[var(--landing-v1-subtle)] py-16 md:py-24">
          <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 sm:px-6 md:gap-24">
            {JOURNEYS.map((j, i) => (
              <div
                key={j.title}
                className={`grid items-center gap-8 md:grid-cols-2 ${
                  i % 2 === 1 ? 'md:[&>*:first-child]:order-last' : ''
                }`}
              >
                <div>
                  <h2 className="mb-4 text-2xl font-bold md:text-3xl">{j.title}</h2>
                  <p className="mb-5 text-[var(--landing-v1-muted)] leading-relaxed">{j.body}</p>
                  <a
                    href="#"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--landing-v1-primary-bright)] hover:underline"
                  >
                    En savoir plus
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
                <JourneyMock badge={j.badge} />
              </div>
            ))}
          </div>
        </section>

        {/* ===================== HOW IT WORKS ===================== */}
        <section className="bg-[var(--landing-v1-surface)] py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">Comment ça marche</h2>
            <ol className="grid gap-8 md:grid-cols-4">
              {STEPS.map((s) => (
                <li key={s.n} className="flex flex-col gap-2">
                  <span className="text-4xl font-bold text-[var(--landing-v1-primary-light)]">
                    {s.n}
                  </span>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="text-sm text-[var(--landing-v1-muted)]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ===================== FAQ ===================== */}
        <section id="faq" className="scroll-mt-20 bg-[var(--landing-v1-subtle)] py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="mb-10 text-center text-3xl font-bold md:text-4xl">
              Questions fréquentes
            </h2>
            <div className="overflow-hidden rounded-2xl border border-[var(--landing-v1-border)] bg-[var(--landing-v1-surface)]">
              {FAQS.map((f, i) => (
                <details
                  key={f.q}
                  className={`landing-v1-faq group ${
                    i > 0 ? 'border-t border-[var(--landing-v1-border)]' : ''
                  }`}
                >
                  <summary className="flex min-h-[56px] cursor-pointer items-center justify-between gap-4 px-5 py-4 font-medium">
                    <span>{f.q}</span>
                    <IconChevronDown className="landing-v1-chevron h-5 w-5 shrink-0 text-[var(--landing-v1-muted)]" />
                  </summary>
                  <div className="px-5 pb-5 text-sm leading-relaxed text-[var(--landing-v1-muted)]">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== CLOSING CTA ===================== */}
        <section className="landing-v1-hero-bg py-20 md:py-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold leading-snug md:text-4xl">{CLOSING_LINE}</h2>
            <Link href="/signup" className={`${PRIMARY_BTN} h-14 text-base`}>
              {HERO.primaryCta}
            </Link>
          </div>
        </section>
      </main>

      {/* ===================== FOOTER ===================== */}
      <footer className="bg-[var(--landing-v1-primary-dark)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="flex flex-col gap-3">
              <span className="text-xl font-bold tracking-tight" role="img" aria-label="Servyou">
                <span className="text-white">Serv</span>
                <span className="text-[var(--landing-v1-primary-light)]">you</span>
              </span>
              <p className="max-w-xs text-sm text-white/70">{TAGLINE}</p>
            </div>

            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/90">
                  {col.title}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-sm text-white/70 transition-colors hover:text-white"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/15 pt-6 sm:flex-row">
            <p className="text-sm text-white/60">{COPYRIGHT}</p>
            <div className="flex items-center gap-4">
              <LangToggle className="border-white/30 text-white" />
              <a
                href="#"
                aria-label="Servyou sur Instagram"
                className="rounded-md text-white/70 transition-colors hover:text-white"
              >
                <IconInstagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                aria-label="Servyou sur Facebook"
                className="rounded-md text-white/70 transition-colors hover:text-white"
              >
                <IconFacebook className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
