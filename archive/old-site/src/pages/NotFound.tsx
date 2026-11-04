import { ArrowRight, Container, btnPrimary } from "../components/ui";

export function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center py-24">
      <Container className="text-center">
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-amber">
          Error 404
        </p>
        <h1 className="mx-auto mt-6 max-w-2xl font-display text-6xl font-semibold tracking-[-0.03em] text-ink-100 md:text-8xl">
          Off the map.
        </h1>
        <p className="mx-auto mt-6 max-w-md font-sans text-lg leading-relaxed text-ink-300">
          This page doesn&rsquo;t exist, or it moved. Let&rsquo;s get you
          back to solid ground.
        </p>
        <a href="#/" className={`${btnPrimary} mt-10`}>
          Back to home
          <ArrowRight />
        </a>
      </Container>
    </section>
  );
}
