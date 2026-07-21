"use client";

import { useEffect } from "react";
import { expireSession, touchSession } from "@/app/login/actions";
import { ACTIVITY_PING_INTERVAL_MS, IDLE_TIMEOUT_MS } from "@/lib/session-timing";

/** Shared across tabs, so working in one keeps the others signed in. */
const STORAGE_KEY = "stockroom:last-activity";

/** How often we compare the clock against the last-activity stamp. */
const CHECK_INTERVAL_MS = 15_000;

/** Don't hit localStorage on every pointermove. */
const WRITE_THROTTLE_MS = 5_000;

// pointermove/pointerdown cover mouse, pen, and touch in one listener.
const ACTIVITY_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "scroll",
] as const;

/** Falls back to this tab's own clock when storage is unavailable (private mode). */
let memoryLastActivity = Date.now();

function readLastActivity(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw === null ? NaN : Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  } catch {
    // storage blocked — fall through
  }
  return memoryLastActivity;
}

function writeLastActivity(at: number): void {
  memoryLastActivity = at;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(at));
  } catch {
    // storage blocked — the in-memory stamp still works for this tab
  }
}

/**
 * Signs the user out after IDLE_TIMEOUT_MS without any interaction.
 *
 * Works off wall-clock timestamps rather than a long setTimeout: background
 * tabs get their timers throttled and a sleeping machine freezes them
 * outright, but the elapsed time since the last event is always truthful. The
 * signed cookie carries its own expiry too, so this component is the prompt
 * redirect, not the security boundary — proxy.ts is.
 */
export function IdleTimeout() {
  useEffect(() => {
    // Reaching this effect means a page just rendered, which means the server
    // handed us a fresh cookie. That's our activity baseline.
    const mountedAt = Date.now();
    let lastWrite = mountedAt;
    let lastPing = mountedAt;
    let expired = false;
    writeLastActivity(mountedAt);

    function onActivity() {
      if (expired) return;
      const now = Date.now();
      if (now - lastWrite < WRITE_THROTTLE_MS) return;
      lastWrite = now;
      writeLastActivity(now);

      if (now - lastPing >= ACTIVITY_PING_INTERVAL_MS) {
        lastPing = now;
        // Slide the httpOnly cookie forward; the client can't touch it directly.
        touchSession().catch(() => {
          // Offline, or the session already died — the next request settles it.
        });
      }
    }

    function check() {
      if (expired || Date.now() - readLastActivity() < IDLE_TIMEOUT_MS) return;
      expired = true;
      expireSession().catch(() => {
        // Navigation failed (offline). The proxy still rejects the dead token.
      });
    }

    // Capture phase so scrolls inside the table wrappers count as activity too.
    const options = { passive: true, capture: true } as const;
    for (const type of ACTIVITY_EVENTS) {
      window.addEventListener(type, onActivity, options);
    }
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      for (const type of ACTIVITY_EVENTS) {
        window.removeEventListener(type, onActivity, { capture: true });
      }
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
