import { useEffect, useRef } from "react";
import { useHashRoute, type Route } from "./lib/useHashRoute";
import { BRAND } from "./components/ui";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { Home } from "./pages/Home";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";
import { NotFound } from "./pages/NotFound";

const titles: Record<Route, string> = {
  home: `${BRAND}: Custom Websites That Look Established, Not Templated`,
  privacy: `Privacy Policy for ${BRAND}`,
  terms: `Terms of Service for ${BRAND}`,
  notfound: `Page Not Found for ${BRAND}`,
};

export default function App() {
  const route = useHashRoute();
  const firstRender = useRef(true);

  useEffect(() => {
    document.title = titles[route];
    // Skip the initial mount so we don't steal focus on first load.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // On route change, reset scroll and move focus to main for screen readers.
    window.scrollTo(0, 0);
    document.getElementById("main")?.focus();
  }, [route]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-obsidian font-sans text-ink-300 antialiased">
      {/* Skip link, focuses main content without polluting the hash. */}
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById("main");
          if (main) {
            main.setAttribute("tabindex", "-1");
            main.focus();
          }
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-amber focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:font-medium focus:text-obsidian"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {route === "home" && <Home />}
        {route === "privacy" && <Privacy />}
        {route === "terms" && <Terms />}
        {route === "notfound" && <NotFound />}
      </main>

      <SiteFooter />
    </div>
  );
}
