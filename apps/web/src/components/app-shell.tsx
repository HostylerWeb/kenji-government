"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FileText,
  MapPin,
  Shield,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Scale,
  FileBarChart,
  Bell,
  ChevronRight,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthUser } from "@kenji-government/shared";
import { cn } from "@/lib/utils";
import { clearAuth } from "@/lib/auth";

// ─── Nav config ──────────────────────────────────────────────
const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/operators", label: "Operators", icon: Building2 },
      { href: "/submissions", label: "Submissions", icon: FileText },
      { href: "/compliance", label: "Compliance", icon: Scale },
      { href: "/enforcement", label: "Enforcement", icon: Shield },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/reports", label: "Reports", icon: FileBarChart },
      { href: "/regional", label: "Regional & Safety", icon: MapPin },
      { href: "/payments", label: "Payments & AML", icon: CreditCard },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/audit", label: "Audit Log", icon: ClipboardList },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  super_user: "Super User",
  viewer: "Viewer",
  analyst: "Analyst",
};

// ─── Component ───────────────────────────────────────────────
export function AppShell({
  user,
  children,
  title,
  breadcrumbs,
}: {
  user: AuthUser;
  children: React.ReactNode;
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function logout() {
    clearAuth();
    window.location.href = "/login";
  }

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Kenya stripe */}
      <div className="kenya-stripe fixed left-0 right-0 top-0 z-50" />

      <div className="flex min-w-0 pt-[3px]">
        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex flex-col border-r",
            "transition-transform duration-200 ease-out",
            "bg-sidebar text-sidebar-foreground border-sidebar-border",
            "w-[var(--sidebar-width)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
          aria-label="Sidebar navigation"
        >
          {/* Logo */}
          <div className="flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gra-green text-xs font-bold text-white">
              GRA
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">GRA Console</p>
              <p className="truncate text-[11px] text-sidebar-muted">Raffle Oversight</p>
            </div>
          </div>

          {/* Nav groups */}
          <nav
            className="flex-1 overflow-y-auto py-3 [-webkit-overflow-scrolling:touch]"
            aria-label="Main navigation"
          >
            {navGroups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted opacity-70">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {active && (
                        <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-gra-green" aria-hidden="true" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom dock */}
          <div className="shrink-0 border-t border-sidebar-border p-3">
            <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                  {user.full_name}
                </p>
                <p className="truncate text-[11px] text-sidebar-muted">
                  {roleLabels[user.role] ?? user.role}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Main column ──────────────────────────────────── */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-[var(--sidebar-width)]">
          {/* Header */}
          <header className="sticky top-[3px] z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex h-[var(--header-height)] min-w-0 items-center gap-2 px-3 sm:gap-4 sm:px-6">
              {/* Hamburger */}
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {/* Breadcrumbs + title */}
              <div className="min-w-0 flex-1">
                {breadcrumbs && breadcrumbs.length > 0 && (
                  <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
                    {breadcrumbs.slice(0, 3).map((crumb, i) => (
                      <span key={i} className="flex min-w-0 items-center gap-1">
                        {i > 0 && (
                          <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
                        )}
                        {crumb.href ? (
                          <Link
                            href={crumb.href}
                            className="truncate max-w-[100px] hover:text-foreground transition-colors"
                          >
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className="truncate max-w-[140px] text-foreground font-medium">
                            {crumb.label}
                          </span>
                        )}
                      </span>
                    ))}
                  </nav>
                )}
                <h1 className="truncate text-base font-semibold text-foreground sm:text-lg leading-tight">
                  {title}
                </h1>
              </div>

              {/* Right side */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  aria-label="Notifications"
                  title="Notifications (coming soon)"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <div className="hidden items-center gap-2 lg:flex">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary text-xs font-semibold">
                    {initials}
                  </div>
                  <div className="hidden xl:block text-right">
                    <p className="text-xs font-medium leading-tight text-foreground">{user.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{roleLabels[user.role] ?? user.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-screen-2xl w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
