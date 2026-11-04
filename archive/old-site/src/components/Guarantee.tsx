/**
 * The promise. Exact language, presented as a confident operator's
 * guarantee, not a hypey badge. Reused near pricing and near the form.
 */
export function Guarantee({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber/30 bg-console p-8 md:p-10 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_85%_at_50%_0%,rgba(240,165,56,0.10),transparent_70%)]" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber/40 bg-amber/10 text-amber">
          <ShieldCheck />
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
            Our promise
          </div>
          <p className="mt-3 max-w-2xl font-display text-xl font-medium leading-[1.42] tracking-[-0.01em] text-ink-100 md:text-2xl">
            We don&rsquo;t start building until you approve the design direction.
            If the concept isn&rsquo;t right, we refine it, or you walk,
            with no charge beyond the deposit. You&rsquo;re never locked into
            something you don&rsquo;t love.
          </p>
        </div>
      </div>
    </div>
  );
}

function ShieldCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
