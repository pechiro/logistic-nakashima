"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Poll the server for fresh data so a teammate's change shows up here without a
 * manual reload. router.refresh() re-runs the current route's server components
 * (re-reading the shared cloud DB) while preserving client state — open drawers,
 * form input, and scroll position are kept. Pauses while the tab is hidden to
 * avoid pointless requests, and refreshes once immediately on becoming visible.
 *
 * This is the "light polling" step; it's a stopgap until true live-push
 * (Supabase Realtime) lands. Interval is intentionally modest to stay cheap.
 */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => router.refresh(), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        router.refresh(); // catch up immediately on refocus
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
