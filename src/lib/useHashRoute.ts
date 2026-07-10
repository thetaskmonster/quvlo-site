import { useEffect, useState } from "react";

export type Route = "home" | "privacy" | "terms" | "notfound";

/**
 * Tiny dependency-free hash router. Only hashes that begin with "#/"
 * are treated as routes, bare in-page anchors like "#work" stay on the
 * home page so smooth-scroll navigation keeps working.
 */
function parse(hash: string): Route {
  if (!hash.startsWith("#/")) return "home";
  const path = hash.slice(1).split("?")[0].replace(/\/+$/, "");
  if (path === "" || path === "/") return "home";
  if (path === "/privacy") return "privacy";
  if (path === "/terms") return "terms";
  return "notfound";
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}
