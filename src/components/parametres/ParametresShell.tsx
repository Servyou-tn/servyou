'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Bell, Shield, Globe, Link2, CheckCircle2, type LucideIcon } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t, LANG_COOKIE, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { Button } from '@/components/ui/button'
import { showSuccessToast } from '@/components/ui/success-toast'
import { updateProfileAction } from '@/app/mon-compte/actions'
import { saveNotificationPrefsAction } from '@/app/parametres/actions'
import { changedKeys, type NotifKey, type NotifPrefs } from '@/lib/notifications/prefs'
import type { CurrentProfile } from '@/lib/marche/mon-compte'
import type { Role } from '@/lib/roles'
import { LangueRegionTab } from './LangueRegionTab'
import { ConfidentialiteTab } from './ConfidentialiteTab'
import { NotificationsTab } from './NotificationsTab'
import { ComptesConnectesTab } from './ComptesConnectesTab'

type TabKey = 'notifications' | 'confidentialite' | 'langue' | 'comptes'

// Order + default active tab match the measured rail (423:17078..423:17113) — Notifications is
// the frame's own pre-selected tab (not re-picking a "nicer" default the frame didn't specify).
const TABS: { key: TabKey; icon: LucideIcon; labelKey: string }[] = [
  { key: 'notifications', icon: Bell, labelKey: 'parametres.rail.notifications' },
  { key: 'confidentialite', icon: Shield, labelKey: 'parametres.rail.confidentialite' },
  { key: 'langue', icon: Globe, labelKey: 'parametres.rail.langue' },
  { key: 'comptes', icon: Link2, labelKey: 'parametres.rail.comptes' },
]

// I2 shell, part 1 (feat/parametres-shell). Owns the two things that outlive a single tab: which
// tab is showing, and the batched dirty/save state (423:16882 dirty / 558:38900 clean) — a footer
// sitting outside the two-col row needs to know about edits regardless of which tab made them.
// Two things carry state: `language` and (B5) the e-mail notification preferences. Both feed the SAME dirty flag, Cancel and Save.
// `notifPrefs` is null when the stored preferences could not be read — the tab then shows a retry state and never a toggle list of
// defaults the user could save over their real choices.
export function ParametresShell({
  profile,
  role,
  notifPrefs,
}: {
  profile: CurrentProfile
  role: Role
  notifPrefs: NotifPrefs | null
}) {
  const lang = useLang()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('notifications')
  const [pending, startTransition] = useTransition()

  const initialLanguage: Lang = profile.language === 'ar' ? 'ar' : 'fr'
  const [language, setLanguage] = useState<Lang>(initialLanguage)
  const [savedLanguage, setSavedLanguage] = useState<Lang>(initialLanguage)

  const [notif, setNotif] = useState<NotifPrefs | null>(notifPrefs)
  const [savedNotif, setSavedNotif] = useState<NotifPrefs | null>(notifPrefs)

  const languageDirty = language !== savedLanguage
  const notifChanged: NotifKey[] = notif && savedNotif ? changedKeys(role, notif, savedNotif) : []
  const isDirty = languageDirty || notifChanged.length > 0

  // Rail-at-375 edge fade: below `lg` the rail is a horizontal `overflow-x-auto` scroller, not the
  // vertical column, and 4 tabs don't fit in ~343px — the last tab was clipped with no affordance
  // hinting more exist. Measured from real rendered rects (not scrollLeft, whose zero-point
  // convention differs by direction) so it's correct for both dir without any RTL-specific branch:
  // "is any button's edge past the nav's own edge" is the same question either way. Verified live
  // (see PR body) that the browser's own initial scroll position already shows tab 1 in both FR and
  // AR — this only ever reads that state, it never sets scrollLeft itself.
  const railRef = useRef<HTMLElement>(null)
  const [railMask, setRailMask] = useState({ hiddenStart: false, hiddenEnd: false })

  useEffect(() => {
    const nav = railRef.current
    if (!nav) return
    function update() {
      if (!nav) return
      const navRect = nav.getBoundingClientRect()
      let hiddenStart = false
      let hiddenEnd = false
      nav.querySelectorAll('button').forEach((b) => {
        const r = b.getBoundingClientRect()
        if (r.left < navRect.left - 1) hiddenStart = true
        if (r.right > navRect.right + 1) hiddenEnd = true
      })
      setRailMask({ hiddenStart, hiddenEnd })
    }
    update()
    nav.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      nav.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const RAIL_FADE = '28px'
  const railMaskImage =
    railMask.hiddenStart && railMask.hiddenEnd
      ? `linear-gradient(to right, transparent, black ${RAIL_FADE}, black calc(100% - ${RAIL_FADE}), transparent)`
      : railMask.hiddenStart
        ? `linear-gradient(to right, transparent, black ${RAIL_FADE})`
        : railMask.hiddenEnd
          ? `linear-gradient(to right, black calc(100% - ${RAIL_FADE}), transparent)`
          : undefined

  function handleCancel() {
    setLanguage(savedLanguage)
    setNotif(savedNotif)
  }

  function handleSave() {
    startTransition(async () => {
      // E-mail preferences first: they change nothing on screen, whereas a language save flips the UI and refreshes, so it goes last
      // and a failed preference save never leaves the page half-translated. Only the toggles that CHANGED are sent.
      if (notif && notifChanged.length > 0) {
        const payload = Object.fromEntries(notifChanged.map((k) => [k, notif[k]]))
        const saved = await saveNotificationPrefsAction(payload)
        if (!saved.ok) {
          toast.error(saved.error)
          return
        }
        setSavedNotif(notif)
        if (!languageDirty) {
          showSuccessToast(t('parametres.toast.saved', language), t('parametres.toast.close', language))
          return
        }
      }
      // updateProfileAction validates the full profile shape — pass the unchanged fields through
      // (same trick the old ParametresForm used) so this save only actually changes language.
      const res = await updateProfileAction({
        fullName: profile.full_name,
        phone: profile.phone ?? '',
        city: profile.city ?? '',
        language,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setSavedLanguage(language)
      // Toast 424:17492. Resolved NOW, in the language just saved: the refresh below flips the UI to it, so
      // the message must not come out in the language being left (and a toast is not re-rendered by t()).
      showSuccessToast(t('parametres.toast.saved', language), t('parametres.toast.close', language))
      // Ruling: saving here must also flip the UI, not just the DB column. Mirrors the topbar
      // LanguageToggle's own recipe verbatim (cookie first, then refresh) rather than inventing a
      // second way to change the app's language — see LanguageToggle.tsx.
      document.cookie = `${LANG_COOKIE}=${language}; path=/; max-age=31536000; SameSite=Lax`
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full flex-col gap-8 lg:flex-row">
        <nav
          ref={railRef}
          aria-label={t('parametres.title', lang)}
          className="flex shrink-0 gap-1 overflow-x-auto lg:w-60 lg:flex-col lg:overflow-visible"
          style={railMaskImage ? { maskImage: railMaskImage, WebkitMaskImage: railMaskImage } : undefined}
        >
          {TABS.map(({ key, icon: Icon, labelKey }) => {
            const active = key === activeTab
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex h-10 shrink-0 items-center overflow-hidden rounded-md',
                  active && 'bg-brand-blue-50',
                  FOCUS_RING,
                )}
              >
                <span className={cn('h-full w-0.5 shrink-0', active && 'bg-brand-blue-600')} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 items-center gap-3 py-2.5 ps-3.5 pe-4">
                  <Icon
                    className={cn('size-5 shrink-0', active ? 'text-brand-blue-600' : 'text-text-secondary')}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      'whitespace-nowrap text-sm',
                      active ? 'font-semibold text-brand-blue-600' : 'font-medium text-text-secondary',
                    )}
                  >
                    {t(labelKey, lang)}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 w-full max-w-[720px]">
          {activeTab === 'notifications' && (
            <NotificationsTab
              role={role}
              value={notif}
              onChange={(key, next) => setNotif((cur) => (cur ? { ...cur, [key]: next } : cur))}
              disabled={pending}
            />
          )}
          {activeTab === 'confidentialite' && <ConfidentialiteTab profile={profile} role={role} />}
          {activeTab === 'langue' && <LangueRegionTab value={language} onChange={setLanguage} />}
          {activeTab === 'comptes' && <ComptesConnectesTab />}
        </div>
      </div>

      {/* Footer — 423:16882 (dirty) / 558:38900 (clean). The bar itself stays full-width (border-t
          keeps running under the rail — it reflects the batched save state regardless of which tab
          made the edit), but its caption+buttons are indented to the CONTENT column's edges, not
          the rail's — the initial build left them flush with the bar's own edges, reading under the
          rail on the left. `ps` = rail width (w-60, 240px) + the row's gap-8 (32px), the exact two
          numbers the rail/content split above already uses; `max-w-[720px]` is the same cap
          contentCol uses, so the inner group's right edge lands on the card's right edge at any
          width instead of a fixed offset that only happens to line up at one viewport. The offset is
          `lg:` only: below `lg` the rail is a horizontal scroller on top of the content, so there is no
          rail column to clear (the unconditional 272px pushed the buttons off-screen at 375). */}
      <div className="border-t border-border-subtle py-5 lg:ps-[calc(240px_+_32px)]">
        <div className="flex w-full max-w-[720px] flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-text-muted">
            {isDirty ? (
              <>
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-warning-500" />
                {t('parametres.footer.dirty', lang)}
              </>
            ) : (
              <>
                {/* success/500 in BOTH 558:38900 and 424:17442 (this was icon-muted: a part-1 measurement miss) */}
                <CheckCircle2 className="size-4 shrink-0 text-success-500" aria-hidden="true" />
                {t('parametres.footer.saved', lang)}
              </>
            )}
          </p>
          {/* flex-wrap: « Annuler les modifications » + « Enregistrer » are wider than a 375 screen's row in FR. */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Measured clean state (558:38900) keeps both buttons enabled, not just visible — not
                gating Cancel on isDirty even though it's a no-op with nothing pending. */}
            <Button type="button" variant="secondary" size="md" onClick={handleCancel} disabled={pending}>
              {t('parametres.footer.cancel', lang)}
            </Button>
            <Button type="button" variant="primary" size="md" onClick={handleSave} loading={pending}>
              {t('parametres.footer.save', lang)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
