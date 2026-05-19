"use client";

import { useEffect } from "react";

/**
 * Unregister any service workers and clear their caches when running in
 * development. No-op in production.
 *
 * Why this exists: `next-pwa` is configured with `disable: true` in dev,
 * but that only stops it from *generating* a new service worker. If you
 * ever ran a production build (or visited a deployed copy of the app on
 * the same host), the browser still has the old SW registered and
 * controlling the page. That SW intercepts requests, serves stale Next.js
 * chunks, and produces the classic "navigation breaks the component
 * until I restart `npm run dev`" symptom — because the dev server has
 * fresh chunks but the SW is shadowing them.
 *
 * Running this on every dev page load makes the issue self-healing:
 * any stale registration is immediately torn down and any cached
 * responses are cleared, so subsequent fetches go to the dev server.
 */
export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;

    let cancelled = false;

    const cleanup = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          if (cancelled) return;
          if (regs.length > 0) {
            await Promise.all(regs.map((r) => r.unregister()));
            // eslint-disable-next-line no-console
            console.info(
              `[dev] Unregistered ${regs.length} service worker(s) — reload once if pages still look stale.`,
            );
          }
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          if (cancelled) return;
          if (keys.length > 0) {
            await Promise.all(keys.map((k) => caches.delete(k)));
            // eslint-disable-next-line no-console
            console.info(`[dev] Cleared ${keys.length} cache(s).`);
          }
        }
      } catch (err) {
        // Never let cleanup itself break the page.
        // eslint-disable-next-line no-console
        console.warn("[dev] Service-worker cleanup failed:", err);
      }
    };

    void cleanup();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
