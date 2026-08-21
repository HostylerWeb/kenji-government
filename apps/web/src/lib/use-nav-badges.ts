"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredAuth } from "@/lib/auth";
import { getNavBadges, type NavBadges } from "@/lib/api";

const EMPTY_BADGES: NavBadges = {
  submissions: 0,
  compliance: 0,
  enforcement: 0,
  payments: 0,
};

export function useNavBadges(refreshKey?: string) {
  const [badges, setBadges] = useState<NavBadges>(EMPTY_BADGES);

  const refresh = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.access_token) {
      setBadges(EMPTY_BADGES);
      return;
    }
    try {
      setBadges(await getNavBadges(auth.access_token));
    } catch {
      // Keep last known counts if refresh fails.
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, [refresh, refreshKey]);

  return badges;
}
