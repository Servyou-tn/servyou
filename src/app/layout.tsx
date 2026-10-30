import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Toaster } from "sonner"
import { getLang } from "@/lib/i18n/server"
import { LangProvider } from "@/components/LangProvider"
import { CookieConsentProvider } from "@/components/consent/CookieConsent"
import { getConsent } from "@/lib/consent/server"

// Self-hosted (src/fonts/README.md): the exact files next/font/google used to download, so the
// build never touches the network. Each call mirrors the @font-face set Google returned (same
// weight descriptors). localFont names the family after the JS const; that name is only reached
// through the CSS variables. Don't rename it via `declarations` — under Turbopack the override
// reaches the @font-face but not the variable, so the variable points at a family that doesn't exist.
const inter = localFont({
  src: "../fonts/inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
})

// Arabic UI font (design system Section 2.3, locked to Cairo). Cairo carries the full
// 400/500/600/700 range — exact weight parity with Inter (Tajawal lacks 600). Applied to RTL
// via globals.css. Cairo is also widely used across MENA/Tunisian marketplaces.
//
// Two subset files under one family. localFont has no per-file unicode-range, so the browser picks
// per glyph: latin is listed first so the fallback metrics are computed from Latin glyphs. Rendering
// was verified pixel-identical to the unicode-range version Google served.
const cairo = localFont({
  src: [
    { path: "../fonts/cairo-latin.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cairo-arabic.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cairo-latin.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cairo-arabic.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cairo-latin.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cairo-arabic.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cairo-latin.woff2", weight: "700", style: "normal" },
    { path: "../fonts/cairo-arabic.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-cairo",
})

const geistMono = localFont({
  src: "../fonts/geist-mono-latin.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "Servyou",
  description: "Votre marketplace tunisienne",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const lang = await getLang()
  // Read on the server so the cookie banner is in the first HTML when the visitor has no valid choice (no flash) — A7.
  const consent = await getConsent()

  // `[scrollbar-gutter:stable]` reserves the scrollbar gutter so a page that grows past the
  // viewport does not reflow the whole layout sideways. Measured on /mes-commandes: expanding
  // one accordion row introduced a vertical scrollbar and moved EVERY horizontal edge 15px left
  // (filter search right 1088 → 1073, topbar 1002 → 987).
  //
  // It lives HERE, as a class on the app's root element, and NOT as an `html { … }` rule in
  // globals.css — `.storybook/preview.ts` imports globals.css by design, so a bare element
  // selector there also styles every story iframe and moved all 16 desktop VRT baselines (max
  // 0.697% against a 0.05% gate). Storybook renders isolated components on a centered canvas
  // with no page to scroll: there is no shift to prevent, so the rule would be pure distortion
  // — 15px narrower component snapshots, forever, for an app-layout reason. Storybook never
  // renders this file, so scoping it to this element is the fix.
  return (
    <html
      lang={lang}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`${inter.variable} ${cairo.variable} ${geistMono.variable} h-full antialiased [scrollbar-gutter:stable]`}
    >
      <body className="min-h-full flex flex-col">
        <LangProvider lang={lang}>
          <CookieConsentProvider initial={consent}>
            {/* The marketing navbar (Header) is no longer mounted here. It only ever
                renders on the landing page, so it now lives inside the landing branch of
                `/` (src/app/page.tsx) — this keeps it OFF the logged-in consumer homepage,
                which renders the /marche shell (its own top bar) on the same `/` route. */}
            {children}
            {/* App-wide toast portal — single source for success/error feedback. */}
            <Toaster position="top-center" richColors />
          </CookieConsentProvider>
        </LangProvider>
      </body>
    </html>
  )
}
