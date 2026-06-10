// Two-tone text wordmark. The launch prototype's SVG no longer exists (its branch
// was disposable), so this is the clean text mark per the brief's fallback:
// "Serv" in brand navy, "you" in brand accent. Screen readers read "Servyou".
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-bold leading-none tracking-tight ${className}`}>
      <span className="text-brand-primary">Serv</span>
      <span className="text-brand-accent">you</span>
    </span>
  )
}
