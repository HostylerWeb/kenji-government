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
import { useState } from "react";
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

  function logout() {
    clearAuth();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="kenya-stripe fixed left-0 right-0 top-0 z-50" />

      <div className="flex pt-1">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-gra-navy text-white transition-transform lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gra-green font-bold">
              GRA
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">GRA Oversight</p>
              <p className="text-xs text-white/70">Raffle Console</p>
            </div>
          </div>

          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
            <div className="mb-3 px-2">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-white/70">{user.email}</p>
              <p className="mt-1 text-xs capitalize text-white/50">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
          <header className="sticky top-1 z-20 border-b border-border bg-white/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-lg p-2 hover:bg-secondary lg:hidden"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <div>
                  {breadcrumbs && breadcrumbs.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      {breadcrumbs.map((crumb, i) => (
                        <span key={crumb.label} className="flex items-center gap-2">
                          {i > 0 && <span>/</span>}
                          {crumb.href ? (
                            <Link href={crumb.href} className="hover:text-foreground">
                              {crumb.label}
                            </Link>
                          ) : (
                            <span className="text-foreground">{crumb.label}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                </div>
              </div>
              <div className="hidden text-sm text-muted sm:block">
                Gambling Regulatory Authority — Kenya
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
