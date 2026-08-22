"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
  tone?: "success" | "warning" | "danger" | "muted" | "primary";
}

const tabToneStyles = {
  success: {
    active: "text-success after:bg-success",
    countActive: "bg-success text-white",
    countIdle: "bg-success-subtle text-success",
  },
  warning: {
    active: "text-warning after:bg-warning",
    countActive: "bg-warning text-white",
    countIdle: "bg-warning-subtle text-warning",
  },
  danger: {
    active: "text-danger after:bg-danger",
    countActive: "bg-danger text-white",
    countIdle: "bg-danger-subtle text-danger",
  },
  muted: {
    active: "text-muted-foreground after:bg-muted-foreground",
    countActive: "bg-muted-foreground text-white",
    countIdle: "bg-secondary text-muted-foreground",
  },
  primary: {
    active: "text-primary after:bg-primary",
    countActive: "bg-primary text-primary-foreground",
    countIdle: "bg-primary-subtle text-primary",
  },
} as const;

export function Tabs({
  tabs,
  active,
  onChange,
  className,
  variant = "pills",
  scrollToTopOnChange = false,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: "pills" | "underline";
  scrollToTopOnChange?: boolean;
}) {
  function handleChange(id: string) {
    onChange(id);
    if (scrollToTopOnChange) {
      window.scrollTo(0, 0);
    }
  }
  if (variant === "underline") {
    return (
      <div
        role="tablist"
        className={cn(
          "flex w-full min-w-0 gap-0 overflow-x-auto border-b border-border [-webkit-overflow-scrolling:touch]",
          className
        )}
      >
        {tabs.map((tab) => {
          const tone = tab.tone ? tabToneStyles[tab.tone] : null;
          const isActive = active === tab.id;
          return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => handleChange(tab.id)}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors outline-none",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:transition-all",
              isActive
                ? tone?.active ?? "text-primary after:bg-primary"
                : "text-muted-foreground hover:text-foreground after:bg-transparent hover:after:bg-border"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  tone?.countActive ??
                    (isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground")
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full min-w-0 gap-1 overflow-x-auto rounded-lg bg-secondary p-1 [-webkit-overflow-scrolling:touch]",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={active === tab.id}
          onClick={() => handleChange(tab.id)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all outline-none",
            active === tab.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                active === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-border text-muted-foreground"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
