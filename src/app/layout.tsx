import type { Metadata } from "next"
import { Inter, Geist_Mono, Cairo } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { getLang } from "@/lib/i18n/server"
import { LangProvider } from "@/components/LangProvider"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

// Arabic UI font (design system Section 2.3, locked to Cairo). Cairo carries the full
// 400/500/600/700 range — exact weight parity with Inter (Tajawal lacks 600). Applied to RTL
// via globals.css. Cairo is also widely used across MENA/Tunisian marketplaces.
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
          {/* The marketing navbar (Header) is no longer mounted here. It only ever
              renders on the landing page, so it now lives inside the landing branch of
              `/` (src/app/page.tsx) — this keeps it OFF the logged-in consumer homepage,
              which renders the /marche shell (its own top bar) on the same `/` route. */}
          {children}
          {/* App-wide toast portal — single source for success/error feedback. */}
          <Toaster position="top-center" richColors />
        </LangProvider>
      </body>
    </html>
  )
}
