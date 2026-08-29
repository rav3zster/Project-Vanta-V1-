import { useEffect, useState } from "react";

// Minimal hash router — no dependency, works inside the Figma Make preview.
export type Route =
  | "home" | "tournaments" | "tournament" | "matches" | "teams"
  | "roster" | "news" | "register" | "dashboard" | "notifications" | "profile";

export function navigate(route: Route) {
  window.location.hash = route === "home" ? "" : `#/${route}`;
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  const known: Route[] = [
    "home", "tournaments", "tournament", "matches", "teams",
    "roster", "news", "register", "dashboard", "notifications", "profile",
  ];
  return (known.includes(raw as Route) ? raw : "home") as Route;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
