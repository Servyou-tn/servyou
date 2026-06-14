import { t, type Lang } from '@/lib/i18n'

// Section 3 — Problem agitation. Headline + one paragraph + a wordless
// side-by-side visual: today's scattered chat-app chaos (left) vs Servyou's
// organized lifecycle (right). The visual "answers the upgrade without words"
// per the template, so it carries no copy of its own. Pale-slate background to
// alternate with the white founder note above it.

// Left panel — four overlapping messaging-app notification blobs (Instagram /
// WhatsApp / Facebook / TikTok), each with an unread-count badge. Brand-agnostic
// tints; mock-only hexes.
const chaosBlobs = [
  { tint: 'bg-[#E1306C]', rotate: '-rotate-6', count: '12' },
  { tint: 'bg-[#25D366]', rotate: 'rotate-3', count: '7' },
  { tint: 'bg-[#1877F2]', rotate: '-rotate-3', count: '23' },
  { tint: 'bg-[#0F172A]', rotate: 'rotate-6', count: '4' },
] as const

export function Problem({ lang }: { lang: Lang }) {
  return (
    <section className="bg-surface-subtle">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="mx-auto max-w-[760px] text-center text-4xl font-bold leading-tight tracking-tight text-text-primary">
          {t('landing.problem.headline', lang)}
        </h2>
        <p className="mx-auto mt-6 max-w-[680px] text-center text-lg leading-relaxed text-text-muted">
          {t('landing.problem.body', lang)}
        </p>

        {/* Wordless before/after comparison */}
        <div className="mt-14 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* Before — chaos */}
          <div className="relative h-64 rounded-2xl border border-border-subtle bg-white p-6">
            <div className="flex h-full items-center justify-center gap-4">
              {chaosBlobs.map((b, i) => (
                <div
                  key={i}
                  className={`relative grid h-16 w-16 place-items-center rounded-2xl ${b.tint} ${b.rotate} shadow-md`}
                  aria-hidden="true"
                >
                  <span className="h-6 w-6 rounded-full bg-white/40" />
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-6 bottom-6 space-y-2" aria-hidden="true">
              <div className="h-2 w-3/4 rounded-full bg-slate-200" />
              <div className="h-2 w-1/2 rounded-full bg-slate-200" />
            </div>
          </div>

          {/* Arrow divider */}
          <div className="hidden place-items-center lg:grid" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>

          {/* After — organized lifecycle cards */}
          <div className="h-64 rounded-2xl border border-border-subtle bg-white p-4">
            <div className="flex h-full flex-col justify-center gap-3" aria-hidden="true">
              {[
                'bg-status-dot-success',
                'bg-brand-accent',
                'bg-[#F59E0B]',
              ].map((dot, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-surface-subtle p-3">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-2/3 rounded-full bg-slate-300" />
                    <div className="h-2 w-1/3 rounded-full bg-slate-200" />
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
