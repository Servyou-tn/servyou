import { MarcheSidebar } from '@/components/marche/MarcheSidebar'

// The /marche marketplace browse page — public (no auth gate for now). Step 1
// renders only the collapsible sidebar + a placeholder main area; the top bar,
// search, products, and services arrive in follow-up commits.
export default function MarchePage() {
  return (
    <div className="flex">
      <MarcheSidebar />
      <main className="flex-1 px-6 py-10">
        <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-dashed border-slate-300 text-sm font-medium text-text-muted">
          Coming next: top bar, search, products, services
        </div>
      </main>
    </div>
  )
}
