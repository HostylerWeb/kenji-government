import { ProtectedRoute } from "@/components/protected-route";
import { SessionIdleMonitor } from "@/components/session-idle-monitor";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SessionIdleMonitor />
      {children}
    </ProtectedRoute>
  );
}
