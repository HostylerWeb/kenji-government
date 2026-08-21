import { ProtectedRoute } from "@/components/protected-route";
import { SessionIdleMonitor } from "@/components/session-idle-monitor";
import { ScrollToTop } from "@/components/scroll-to-top";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <ScrollToTop />
      <SessionIdleMonitor />
      {children}
    </ProtectedRoute>
  );
}
