"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/use-auth";

const STUCK_MS = 4000;

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAuth();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (ready) {
      document.documentElement.setAttribute("data-gra-booted", "1");
      setStuck(false);
      return;
    }

    const timer = window.setTimeout(() => setStuck(true), STUCK_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (!ready) {
    return (
      <div
        data-session-loading="1"
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center text-sm text-muted"
      >
        <p>Loading session...</p>
        {stuck && (
          <div className="space-y-2">
            <p className="text-xs text-danger">
              Session check is taking too long. The local app cache may be stale.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium"
                onClick={() => {
                  localStorage.clear();
                  window.location.replace("/login");
                }}
              >
                Clear session & sign in
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
