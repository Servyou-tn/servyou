import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { getLang } from "@/lib/i18n/server"
import { LangProvider } from "@/components/LangProvider"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LangProvider lang={lang}>
          {children}
          {/* Always-visible language switcher — Phase 8 Subtask 1 */}
          <div className="fixed bottom-4 end-4 z-50 bg-white border border-gray-200 rounded-lg shadow-md px-2 py-1.5">
            <LanguageSwitcher />
          </div>
        </LangProvider>
      </body>
    </html>
  )
}
