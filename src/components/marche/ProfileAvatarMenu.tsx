'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { LogOut, Settings, User, Store, Briefcase } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type TopBarUser = {
  id: string
  email: string
  full_name: string | null
  seller_type: 'shop_owner' | 'freelancer' | null
}

// "Moatez Zaier" → "MZ", "moatez@servyou.tn" → "M", single word → first letter,
// empty → "?". Email falls back to the local part before deriving the letter.
export function getInitials(nameOrEmail: string): string {
  const source = (nameOrEmail ?? '').trim()
  if (!source) return '?'
  const base = source.includes('@') ? source.split('@')[0] : source
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

// The third button in the /marche icon cluster. Logged in → Radix dropdown
// (Mon profil / Paramètres / Déconnexion). Logged out → the same circular button
// renders a generic person glyph linking to /connexion (the cluster always shows,
// per the public-page decision). `triggerClassName` is the shared 44×44 circular
// style passed down from MarcheTopBar so the scroll-aware surface stays in sync.
export function ProfileAvatarMenu({
  user,
  triggerClassName,
}: {
  user: TopBarUser | null
  triggerClassName: string
}) {
  const lang = useLang()
  const signOutFormRef = useRef<HTMLFormElement>(null)

  // Reuses the existing /auth/signout route handler (signOut + redirect to
  // /connexion) — no new server action. Submitting the hidden form keeps that
  // single source of truth while letting the Radix item drive it via onSelect.
  function handleSignOut() {
    signOutFormRef.current?.requestSubmit()
  }

  if (!user) {
    return (
      <Link href="/connexion" aria-label={t('nav.login', lang)} className={triggerClassName}>
        <User className="h-5 w-5 text-text-primary" aria-hidden="true" />
      </Link>
    )
  }

  const displayName = user.full_name?.trim() || user.email.split('@')[0]
  const itemBase =
    'cursor-pointer text-text-primary focus:bg-surface-subtle focus:text-text-primary'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={triggerClassName} aria-label={t('nav.account', lang)}>
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-brand-primary text-sm font-medium text-white">
                {getInitials(user.full_name || user.email)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-56 rounded-2xl border border-border-subtle bg-white p-1 shadow-lg"
        >
          <div className="border-b border-border-subtle px-3 py-2.5">
            <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
            <p className="truncate text-xs text-text-muted">{user.email}</p>
          </div>

          <DropdownMenuItem asChild className={itemBase}>
            <Link href="/mon-compte">
              <User className="me-2 h-4 w-4 text-text-muted" aria-hidden="true" />
              {t('nav.profile', lang)}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className={itemBase}>
            <Link href="/parametres">
              <Settings className="me-2 h-4 w-4 text-text-muted" aria-hidden="true" />
              {t('marche.sidebar.parametres', lang)}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border-subtle" />

          {/* Role-upgrade discovery (Path A — strict single role at MVP). Consumer sees
              both upgrade paths; a seller sees only their own workspace link. The
              workspace routes (/ma-boutique, /mon-profil-freelance) 404 until built. */}
          {user.seller_type === null && (
            <>
              <DropdownMenuItem asChild className={itemBase}>
                <Link href="/devenir-vendeur">
                  <Store className="me-2 h-4 w-4 text-text-muted" aria-hidden="true" />
                  {t('profileMenu.devenirVendeur', lang)}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={itemBase}>
                <Link href="/devenir-freelance">
                  <Briefcase className="me-2 h-4 w-4 text-text-muted" aria-hidden="true" />
                  {t('profileMenu.devenirFreelance', lang)}
                </Link>
              </DropdownMenuItem>
            </>
          )}

          {user.seller_type === 'shop_owner' && (
            <DropdownMenuItem asChild className={itemBase}>
              <Link href="/ma-boutique">
                <Store className="me-2 h-4 w-4 text-text-muted" aria-hidden="true" />
                {t('profileMenu.espaceVendeur', lang)}
              </Link>
            </DropdownMenuItem>
          )}

          {user.seller_type === 'freelancer' && (
            <DropdownMenuItem asChild className={itemBase}>
              <Link href="/mon-profil-freelance">
                <Briefcase className="me-2 h-4 w-4 text-text-muted" aria-hidden="true" />
                {t('profileMenu.espaceFreelance', lang)}
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="bg-border-subtle" />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              handleSignOut()
            }}
            className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
          >
            <LogOut className="me-2 h-4 w-4 text-red-600" aria-hidden="true" />
            {t('nav.logout', lang)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden form target for handleSignOut — posts to the existing signout route. */}
      <form ref={signOutFormRef} action="/auth/signout" method="POST" className="hidden" />
    </>
  )
}
