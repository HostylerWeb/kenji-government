"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({
  tabs,
  active,
  onChange,
  className,
  variant = "pills",
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: "pills" | "underline";
}) {
  if (variant === "underline") {
    return (
      <div
        role="tablist"
        className={cn(
          "flex w-full min-w-0 gap-0 overflow-x-auto border-b border-border [-webkit-overflow-scrolling:touch]",
          className
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors outline-none",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:transition-all",
              active === tab.id
                ? "text-primary after:bg-primary"
                : "text-muted-foreground hover:text-foreground after:bg-transparent hover:after:bg-border"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
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
          onClick={() => onChange(tab.id)}
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
