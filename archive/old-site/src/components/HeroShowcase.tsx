/**
 * Hero centerpiece, real work, not an abstract render. A browser-framed
 * site design (with a second design peeking behind to signal range),
 * floating over a soft amber glow. Decorative to the a11y tree: the hero's
 * h1 and copy carry the meaning, so the whole showcase is aria-hidden and
 * its images use empty alt.
 */
export function HeroShowcase() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[560px] px-1 py-6"
    >
      {/* amber depth glow */}
      <div className="qv-pulse pointer-events-none absolute inset-x-6 inset-y-3 rounded-[48px] bg-[radial-gradient(circle_at_58%_42%,rgba(240,165,56,0.20),transparent_65%)] blur-3xl" />

      {/* secondary window, a second design, peeking behind */}
      <div className="absolute right-[-3%] top-[-3%] hidden w-[60%] rotate-[3deg] overflow-hidden rounded-lg border border-white/10 bg-[#0e0f13] opacity-85 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)] sm:block">
        <Chrome url="northside.dental" compact />
        <div className="relative aspect-[16/10]">
          <img
            src="/images/dental.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative flex h-full flex-col justify-between p-3 text-white">
            <span className="font-display text-[10px] font-semibold">
              Northside Dental
            </span>
            <div className="font-display text-[13px] font-semibold leading-tight">
              A brighter visit.
            </div>
          </div>
        </div>
      </div>

      {/* main window, the featured design */}
      <div className="qv-float relative overflow-hidden rounded-xl border border-white/12 bg-[#0e0f13] shadow-[0_45px_110px_-30px_rgba(0,0,0,0.95)]">
        <Chrome url="halcyon.co" />
        <div className="relative aspect-[16/11]">
          <img
            src="/images/medspa.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />
          <div className="relative flex h-full flex-col justify-between p-5 text-white">
            <div className="flex items-center justify-between">
              <span className="font-display text-[14px] font-semibold tracking-[0.12em]">
                HALCYON
              </span>
              <nav className="flex items-center gap-3 font-sans text-[9px] text-white/85">
                <span>Treatments</span>
                <span>Membership</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-black">
                  Book
                </span>
              </nav>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/75">
                Wellness &amp; Spa
              </p>
              <div className="mt-1.5 font-display text-[30px] font-semibold leading-[0.98] tracking-[-0.02em]">
                Rest is a ritual.
              </div>
              <span className="mt-3 inline-flex rounded-full bg-white px-3.5 py-1.5 font-sans text-[10px] font-semibold text-black">
                Book your escape
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chrome({ url, compact = false }: { url: string; compact?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 border-b border-white/[0.08] bg-white/[0.03] px-3 ${
        compact ? "py-1.5" : "py-2.5"
      }`}
    >
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
      </div>
      <div className="mx-auto rounded bg-black/40 px-4 py-0.5 font-mono text-[9px] tracking-wide text-white/40">
        {url}
      </div>
    </div>
  );
}
