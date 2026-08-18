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
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthUser } from "@kenji-government/shared";
import { cn } from "@/lib/utils";
import { clearAuth } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/operators", label: "Operators", icon: Building2 },
  { href: "/submissions", label: "Submissions", icon: FileText },
  { href: "/compliance", label: "Compliance", icon: Scale },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/enforcement", label: "Enforcement", icon: Shield },
  { href: "/audit", label: "Audit Log", icon: ClipboardList },
  { href: "/regional", label: "Regional & Player Safety", icon: MapPin },
  { href: "/payments", label: "Payments & AML", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

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

  function logout() {
    clearAuth();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="kenya-stripe fixed left-0 right-0 top-0 z-50" />

      <div className="flex min-w-0 pt-1">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 min-h-screen flex-col border-r border-border bg-gra-navy text-white transition-transform lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4 sm:px-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gra-green font-bold">
              GRA
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">GRA Oversight</p>
              <p className="truncate text-xs text-white/70">Raffle Console</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4 [-webkit-overflow-scrolling:touch]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-white/10 p-4">
            <div className="mb-3 px-2">
              <p className="truncate text-sm font-medium">{user.full_name}</p>
              <p className="truncate text-xs text-white/70">{user.email}</p>
              <p className="mt-1 text-xs capitalize text-white/50">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-64">
          <header className="sticky top-1 z-20 border-b border-border bg-white/95 backdrop-blur">
            <div className="flex h-14 min-w-0 items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-4 lg:px-8">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-2 hover:bg-secondary lg:hidden"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label="Toggle menu"
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <div className="min-w-0">
                  {breadcrumbs && breadcrumbs.length > 0 ? (
                    <div
                      className="flex min-w-0 items-center gap-1 text-xs text-muted sm:gap-2 sm:text-sm"
                    >
                      {breadcrumbs.map((crumb, i) => (
                        <span
                          key={`${crumb.label}-${i}`}
                          className="flex min-w-0 items-center gap-1 sm:gap-2"
                        >
                          {i > 0 && <span className="shrink-0">/</span>}
                          {crumb.href ? (
                            <Link
                              href={crumb.href}
                              className="truncate hover:text-foreground"
                            >
                              {crumb.label}
                            </Link>
                          ) : (
                            <span className="truncate text-foreground">{crumb.label}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
                    {title}
                  </h1>
                </div>
              </div>
              <div className="hidden shrink-0 text-sm text-muted lg:block">
                Gambling Regulatory Authority — Kenya
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
