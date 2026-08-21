"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@kenji-government/shared";
import { clearAuth, getStoredAuth } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const auth = getStoredAuth();
      if (!auth) {
        setUser(null);
        setToken(null);
        setReady(true);
        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
        return;
      }

      setUser(auth.user);
      setToken(auth.access_token);
      setReady(true);
    } catch {
      clearAuth();
      setUser(null);
      setToken(null);
      setReady(true);
      window.location.replace("/login");
    }
  }, []);

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
