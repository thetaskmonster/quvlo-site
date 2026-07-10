import { Container, Eyebrow, FadeUp } from "./ui";

const cards = [
  {
    n: "01",
    title: "Designed, not decorated",
    body: "Every layout is drawn from your business, not a theme bought off a shelf and recolored. The result looks like you, because it is.",
  },
  {
    n: "02",
    title: "Engineered to last",
    body: "Hand-written code, no bloated page builders. Fast the day it ships, and still maintainable three years from now.",
  },
  {
    n: "03",
    title: "Operated, not abandoned",
    body: "Launch is day one, not the finish line. Care plans keep your site fast, current, and quietly monitored.",
  },
];

export function Approach() {
  return (
    <section id="approach" className="scroll-mt-24 py-28 md:py-40">
      <Container>
        <FadeUp>
          <Eyebrow>The approach</Eyebrow>
        </FadeUp>
        <FadeUp delay={0.06}>
          <h2 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-[-0.02em] text-ink-100 md:text-5xl">
            Built like operations, not like a template.
          </h2>
        </FadeUp>

        <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline md:grid-cols-3">
          {cards.map((card, i) => (
            <FadeUp key={card.n} delay={0.08 * i} className="h-full">
              <article className="flex h-full flex-col bg-panel p-8 md:p-10">
                <span className="font-mono text-xs tracking-[0.2em] text-amber">
                  {card.n}
                </span>
                <h3 className="mt-6 font-display text-xl font-semibold text-ink-100">
                  {card.title}
                </h3>
                <p className="mt-3 font-sans text-[15px] leading-relaxed text-ink-300">
                  {card.body}
                </p>
              </article>
            </FadeUp>
          ))}
        </div>
      </Container>
    </section>
  );
}
