"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@kenji-government/shared";
import { clearAuth, getStoredAuth } from "@/lib/auth";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let hardRedirectTimer: number | undefined;

    try {
      const auth = getStoredAuth();
      if (!auth) {
        if (!cancelled) {
          setUser(null);
          setToken(null);
          setReady(true);
        }
        router.replace("/login");
        // Soft navigate can stall; force a hard redirect as fallback.
        hardRedirectTimer = window.setTimeout(() => {
          if (window.location.pathname !== "/login") {
            window.location.replace("/login");
          }
        }, 2000);
        return () => {
          cancelled = true;
          if (hardRedirectTimer) window.clearTimeout(hardRedirectTimer);
        };
      }

      if (!cancelled) {
        setUser(auth.user);
        setToken(auth.access_token);
        setReady(true);
      }
    } catch {
      clearAuth();
      if (!cancelled) {
        setUser(null);
        setToken(null);
        setReady(true);
      }
      window.location.replace("/login");
    }

    return () => {
      cancelled = true;
      if (hardRedirectTimer) window.clearTimeout(hardRedirectTimer);
    };
  }, [router]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AuthUser>).detail;
      if (detail) setUser(detail);
    };
    window.addEventListener("gra-auth-updated", handler);
    return () => window.removeEventListener("gra-auth-updated", handler);
  }, []);

  return { user, token, ready };
}
