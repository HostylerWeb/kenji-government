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
  ChevronRight,
  PanelLeftClose,
  User,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "@kenji-government/shared";
import { cn } from "@/lib/utils";
import { clearAuth } from "@/lib/auth";
import { logoutRequest } from "@/lib/api";
import { NotificationsBell } from "@/components/notifications-bell";
import { useNavBadges } from "@/lib/use-nav-badges";
import type { NavBadges } from "@/lib/api";

const navBadgeKeyByHref: Partial<Record<string, keyof NavBadges>> = {
  "/submissions": "submissions",
  "/compliance": "compliance",
  "/enforcement": "enforcement",
  "/payments": "payments",
};

function NavBadgeCount({
  count,
  collapsed,
}: {
  count: number;
  collapsed: boolean;
}) {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  if (collapsed) {
    return (
      <span
        className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white"
        aria-label={`${count} items need attention`}
      >
        {count > 9 ? "9+" : label}
      </span>
    );
  }

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold leading-none text-white">
      {label}
    </span>
  );
}

const navGroups = [
  {
    label: "Main Menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/operators", label: "Operators", icon: Building2 },
      { href: "/submissions", label: "Submissions", icon: FileText },
      { href: "/compliance", label: "Compliance", icon: Scale },
      { href: "/enforcement", label: "Enforcement", icon: Shield },
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

const mobileTabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/operators", label: "Operators", icon: Building2 },
  { href: "/submissions", label: "Queue", icon: FileText, badgeKey: "submissions" as const },
  { href: "/enforcement", label: "Cases", icon: Shield, badgeKey: "enforcement" as const },
  { href: "/settings", label: "More", icon: Settings },
];

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  super_admin: "Super Administrator",
  super_user: "Super User",
  supervisor: "Supervisor",
  viewer: "Viewer",
  analyst: "Analyst",
  auditor: "Auditor",
};

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
  const navBadges = useNavBadges(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  async function logout() {
    try {
      const authRaw = localStorage.getItem("gra_access_token");
      if (authRaw) {
        await logoutRequest(authRaw);
      }
    } catch {
      // Still sign out locally if the API call fails.
    }
    clearAuth();
    window.location.href = "/login";
  }

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarW = collapsed ? "w-[76px]" : "w-[var(--sidebar-width)]";

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-border bg-white transition-all duration-200",
          sidebarW,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Sidebar navigation"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <img src="/gra-crest.png" alt="GRA" className="h-full w-full object-contain p-1" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">GRA Kenya</p>
              <p className="truncate text-[11px] text-slate-500">Raffle Oversight</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const badgeKey = navBadgeKeyByHref[item.href];
                const badgeCount = badgeKey ? navBadges[badgeKey] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-primary/10 font-bold text-primary"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    <NavBadgeCount count={badgeCount} collapsed={collapsed} />
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col pb-16 transition-all duration-200 lg:pb-0",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[var(--sidebar-width)]"
        )}
      >
        <div className="kenya-flag-bar hidden lg:block" />

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-3 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              className="shrink-0 rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <button
              type="button"
              className="hidden shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:inline-flex"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>

            <div className="min-w-0 sm:hidden">
              <h1 className="truncate text-sm font-semibold">{title}</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 lg:gap-2">
            <NotificationsBell />
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-slate-100"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a551] text-xs font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden text-left xl:block">
                  <p className="text-xs font-semibold leading-tight text-slate-900">
                    {user.full_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {roleLabels[user.role] ?? user.role}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "hidden h-4 w-4 text-slate-400 transition-transform lg:block",
                    userMenuOpen && "rotate-180",
                  )}
                />
              </button>
              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg"
                >
                  <div className="border-b border-border px-4 py-3 xl:hidden">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user.full_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {roleLabels[user.role] ?? user.role}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-destructive hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="hidden border-b border-border bg-card px-6 py-2.5 sm:block">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-1 text-xs text-slate-500" aria-label="Breadcrumb">
              {breadcrumbs.slice(0, 3).map((crumb, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />}
                  {crumb.href ? (
                    <Link href={crumb.href} className="truncate hover:text-slate-900">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate font-medium text-slate-900">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : (
            <p className="text-xs text-slate-400">Gambling Regulatory Authority — Kenya</p>
          )}
        </div>

        <main className="min-w-0 flex-1 overflow-x-hidden p-3 lg:p-6">
          <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
        </main>

        <footer className="hidden border-t border-border bg-card px-6 py-3 lg:block">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>Republic of Kenya · Gambling Regulatory Authority</p>
            <p>Raffle Oversight Console v1.0.0</p>
          </div>
        </footer>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden">
        <div className="flex items-center justify-around py-2">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const active =
              pathname === tab.href ||
              (tab.href !== "/dashboard" && pathname.startsWith(`${tab.href}/`));
            const badgeCount = tab.badgeKey ? navBadges[tab.badgeKey] : 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {badgeCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
