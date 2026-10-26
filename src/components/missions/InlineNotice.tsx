import { AlertCircle } from 'lucide-react'

// Amber in-place notice — « all amber, never red » (docs/design/h9-h13-measurements.md §3.4 specimens 378:10917 / 378:10929
// and §4.2): a failed proposal is a situation, not a user error, so it is warning/50 with a warning/500 hairline and
// warning/700 text, never danger. `role="alert"` so a screen reader announces it when it appears after a submit.
export function InlineNotice({
  title,
  children,
  actions,
}: {
  title: string
  children?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-warning-500 bg-warning-50 p-4">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning-700" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-body-sm font-semibold text-warning-700">{title}</p>
        {children ? <div className="text-body-sm text-text-secondary">{children}</div> : null}
        {actions ? <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{actions}</div> : null}
      </div>
    </div>
  )
}
