"use client";

import { useAuth } from "@/lib/use-auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
