"use client";

import { useEffect } from "react";
import {
  clearAuth,
  SESSION_IDLE_MS,
  touchSessionActivity,
} from "@/lib/auth";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

export function SessionIdleMonitor() {
  useEffect(() => {
    touchSessionActivity();

    let lastTouch = Date.now();

    function onActivity() {
      const now = Date.now();
      if (now - lastTouch < 30000) return;
      lastTouch = now;
      touchSessionActivity();
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const interval = window.setInterval(() => {
      const raw = localStorage.getItem("gra_last_activity");
      if (!raw) return;
      const last = Number(raw);
      if (!Number.isFinite(last)) return;
      if (Date.now() - last > SESSION_IDLE_MS) {
        clearAuth();
        window.location.href = "/login?reason=idle";
      }
    }, 60000);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
