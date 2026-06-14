import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import "./globals.css"
import { getLang } from "@/lib/i18n/server"
import { LangProvider } from "@/components/LangProvider"
import { Header } from "@/components/layout/Header"

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
          {/* Marketing navbar — renders only on the landing page (/), identically
              for every visitor. It no longer needs the session, so the layout does
              no per-request auth/profile fetch. The sellerType/fullName props feed
              the preserved account-avatar branch for the future per-role navbars. */}
          <Header sellerType={null} fullName={null} />
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
