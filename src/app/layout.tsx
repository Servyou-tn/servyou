import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { getLang } from "@/lib/i18n/server"
import { LangProvider } from "@/components/LangProvider"
import { Header } from "@/components/layout/Header"
import { createClient } from "@/lib/supabase/server"
import type { SellerType } from "@/lib/layout/select-variant"

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

  // Server-only facts the client Header needs to choose its variant and render
  // the account avatar. One getUser() + one indexed PK lookup per request.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let sellerType: SellerType = null
  let fullName: string | null = null
  if (user) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('seller_type, full_name')
      .eq('id', user.id)
      .single()
    if (error) console.error('[layout] profile fetch error:', error)
    sellerType = (profile?.seller_type as SellerType) ?? null
    fullName = profile?.full_name ?? null
  }

  return (
    <html
      lang={lang}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LangProvider lang={lang}>
          <Header isLoggedIn={!!user} sellerType={sellerType} fullName={fullName} />
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
