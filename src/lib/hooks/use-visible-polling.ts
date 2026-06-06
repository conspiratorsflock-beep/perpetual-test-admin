"use client";

import { useEffect, useRef } from "react";

/**
 * Poll a callback at a fixed interval, but only while the document is visible.
 * Triggers one immediate poll when the tab becomes visible again.
 */
export function useVisiblePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true
) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState === "visible") {
        callbackRef.current();
      }
    };

    // Initial fetch
    tick();

    intervalId = setInterval(tick, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        callbackRef.current();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
