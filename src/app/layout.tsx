import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { getLang } from "@/lib/i18n/server"
import { LangProvider } from "@/components/LangProvider"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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

  return (
    <html
      lang={lang}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
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
