"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string, callback: () => void) {
  const mediaQueryList = window.matchMedia(query);
  mediaQueryList.addEventListener("change", callback);
  return () => mediaQueryList.removeEventListener("change", callback);
}

// SSR-safe: the server snapshot always reports `false`, so anything gated on this hook
// renders its desktop layout by default and only swaps to the mobile variant once React
// hydrates and can read the real viewport — no hydration mismatch, no effect-driven
// re-render cascade (useSyncExternalStore is the primitive built for exactly this:
// subscribing to external, mutable state like matchMedia).
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Matches the table<->card breakpoint used throughout the app (Tailwind's `md`).
// Most components use pure CSS (`hidden md:block` / `md:hidden`) for that switch — reach
// for this only where two mounted copies of something would be a real problem (e.g. a
// component that opens a camera stream or otherwise has side effects on mount).
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
