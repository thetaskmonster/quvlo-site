import { Container, CountUp, FadeUp } from "./ui";
import type { ReactNode } from "react";

/* Standards, not vanity metrics, each is a commitment we can stand behind. */
const stats: { value: ReactNode; label: string }[] = [
  {
    value: <CountUp to={100} />,
    label: "Lighthouse performance target on every build",
  },
  { value: "0", label: "Templates used. Ever." },
  { value: "24/7", label: "Uptime monitoring on every Care Plan" },
];

export function Metrics() {
  return (
    <section className="border-t border-hairline bg-panel/20 py-24 md:py-32">
      <Container className="grid gap-12 md:grid-cols-3">
        {stats.map((stat, i) => (
          <FadeUp key={i} delay={0.08 * i} className="text-center md:text-left">
            <div className="font-display text-6xl font-semibold tracking-tight text-ink-100 md:text-7xl">
              {stat.value}
            </div>
            <div className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-ink-500">
              {stat.label}
            </div>
          </FadeUp>
        ))}
      </Container>
    </section>
  );
}
