'use client'

import Script from 'next/script'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

// Cloudflare Turnstile, invisible. The widget's mode (Invisible) is set on the Cloudflare dashboard, not here;
// `appearance: 'interaction-only'` keeps it hidden unless Cloudflare demands an interaction.
// `execution: 'execute'` — no token until the form asks for one on submit, so every submit gets a FRESH token
// (tokens are single-use and expire after 300 s); a second submit resets the widget first.
//
// No NEXT_PUBLIC_TURNSTILE_SITE_KEY (local dev without keys, CI) → nothing loads and getToken() resolves
// undefined; the server skips verification only when its secret is absent too (src/lib/security/turnstile.ts).
// CSP: challenges.cloudflare.com in script-src + frame-src (src/lib/security/headers.ts).

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
// Long enough for a user to solve an interactive challenge when Cloudflare demands one.
const TOKEN_WAIT_MS = 60000

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string | undefined
  execute: (widgetId: string) => void
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export type TurnstileHandle = {
  /** A fresh token for this submit, or undefined (no site key, script blocked, challenge failed / timed out). */
  getToken: () => Promise<string | undefined>
}

export function Turnstile({ action, ref }: { action: string; ref: Ref<TurnstileHandle> }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const container = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const used = useRef(false)
  const failed = useRef(false)
  const executeWhenReady = useRef(false)
  const waiting = useRef<((token: string | undefined) => void) | null>(null)

  function settle(token: string | undefined) {
    const resolve = waiting.current
    waiting.current = null
    resolve?.(token)
  }

  function run() {
    const api = window.turnstile
    const id = widgetId.current
    if (!api || !id) {
      executeWhenReady.current = true
      return
    }
    executeWhenReady.current = false
    if (used.current) api.reset(id)
    used.current = true
    api.execute(id)
  }

  function renderWidget() {
    const api = window.turnstile
    if (!api || !siteKey || !container.current || widgetId.current) return
    widgetId.current =
      api.render(container.current, {
        sitekey: siteKey,
        action,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token: string) => settle(token),
        'error-callback': () => settle(undefined),
        'timeout-callback': () => settle(undefined),
      }) ?? null
    if (executeWhenReady.current) run()
  }

  useImperativeHandle(ref, () => ({
    getToken: () => {
      if (!siteKey || failed.current) return Promise.resolve(undefined)
      settle(undefined) // a superseded wait resolves empty
      return new Promise<string | undefined>((resolve) => {
        const timer = setTimeout(() => settle(undefined), TOKEN_WAIT_MS)
        waiting.current = (token) => {
          clearTimeout(timer)
          resolve(token)
        }
        run()
      })
    },
  }))

  // Render on mount when the script is already there (a remount, StrictMode's re-mount), and on the script's
  // onLoad otherwise. next/script's onReady is NOT enough: an instance that mounts while the script is still
  // loading never gets it. renderWidget is idempotent (widgetId guard).
  useEffect(() => {
    renderWidget()
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
      settle(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / unmount only; the helpers read refs
  }, [])

  if (!siteKey) return null
  return (
    <>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={renderWidget}
        onReady={renderWidget}
        onError={() => {
          failed.current = true
          settle(undefined)
        }}
      />
      <div ref={container} className="contents" />
    </>
  )
}
