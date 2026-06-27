// ⚠️ THROWAWAY — PR-DS-1 design-token verification page.
// Proves the Section 2 tokens generate working Tailwind v4 utility classes. Dev-only, not
// linked in any nav; the English labels are intentional (they are token names, not product copy,
// so the i18n vocabulary lock does not apply here). REMOVE this route once the Settings page
// (PR-PAGE-1) ships and serves as the real proof of the token system.

export default function DesignTokensVerificationPage() {
  return (
    <main className="min-h-screen bg-surface-subtle p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-section">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 text-text-primary">PR-DS-1 — Token verification</h1>
          <p className="text-body-sm text-text-muted">
            Throwaway page. Removed once the Settings page (PR-PAGE-1) ships as real proof.
          </p>
        </header>

        {/* 3 color samples — primitives as bg utilities + text-inverse */}
        <section className="flex flex-col gap-4">
          <p className="text-section-cap uppercase text-text-muted">Colors</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-card bg-brand-navy-900 p-6 text-text-inverse">bg-brand-navy-900</div>
            <div className="rounded-card bg-brand-blue-600 p-6 text-text-inverse">bg-brand-blue-600</div>
            <div className="rounded-card bg-success-500 p-6 text-text-inverse">bg-success-500</div>
          </div>
        </section>

        {/* 2 typography samples */}
        <section className="flex flex-col gap-4">
          <p className="text-section-cap uppercase text-text-muted">Typography</p>
          <h1 className="text-h1 text-text-primary">Title — text-h1 (30px / 700)</h1>
          <p className="text-body-sm text-text-muted">Body small — text-body-sm (13px / 400)</p>
        </section>

        {/* 2 spacing samples — canonical card padding + section gap */}
        <section className="flex flex-col gap-4">
          <p className="text-section-cap uppercase text-text-muted">Spacing</p>
          <div className="rounded-card border border-border-subtle bg-surface-base p-6 text-body text-text-primary">
            Card with p-6 — canonical 24px padding
          </div>
          <div className="flex gap-section rounded-card border border-border-subtle bg-surface-base p-6">
            <span className="text-body text-text-primary">gap-section</span>
            <span className="text-body text-text-muted">= 32px between these</span>
          </div>
        </section>

        {/* 1 radius + 1 shadow sample */}
        <section className="flex flex-col gap-4">
          <p className="text-section-cap uppercase text-text-muted">Radius + Shadow</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-card border border-border-subtle bg-surface-base p-6 text-body text-text-primary">
              rounded-card (12px)
            </div>
            <div className="rounded-card bg-surface-base p-6 text-body text-text-primary shadow-card">
              shadow-card (subtle)
            </div>
          </div>
        </section>

        {/* 1 stat-tile-style preview — brand colors + typography tokens */}
        <section className="flex flex-col gap-4">
          <p className="text-section-cap uppercase text-text-muted">Stat tile preview</p>
          <div className="inline-flex w-48 flex-col gap-2 rounded-card border border-border-subtle bg-surface-base p-6 shadow-card">
            <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-brand-blue-100 text-label text-brand-blue-600">
              ★
            </span>
            <p className="text-label text-text-secondary">Total Services</p>
            <p className="text-stat-number text-brand-navy-700">12</p>
          </div>
        </section>
      </div>
    </main>
  )
}
