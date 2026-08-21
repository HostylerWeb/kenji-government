"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type DatePreset,
  type DateRange,
  resolveDateRange,
} from "@/lib/date-range";

const PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "custom", label: "Custom" },
];

interface PerformanceDateFilterProps {
  preset: DatePreset;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: DatePreset) => void;
  onCustomApply: (from: string, to: string) => void;
  className?: string;
}

function defaultCustomRange() {
  return resolveDateRange("this_month");
}

export function PerformanceDateFilter({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomApply,
  className,
}: PerformanceDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(customFrom);
  const [draftTo, setDraftTo] = useState(customTo);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const range = resolveDateRange(preset, customFrom, customTo);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelWidth = 256;
    const margin = 8;
    const left = Math.min(
      Math.max(margin, rect.right - panelWidth),
      window.innerWidth - panelWidth - margin,
    );

    setPanelStyle({
      position: "fixed",
      top: rect.bottom + margin,
      left,
      width: panelWidth,
      zIndex: 50,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setDraftFrom(customFrom);
      setDraftTo(customTo);
      return;
    }

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, customFrom, customTo, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function selectPreset(next: DatePreset) {
    if (next === "custom") {
      const defaults =
        customFrom && customTo
          ? { from: customFrom, to: customTo }
          : defaultCustomRange();
      setDraftFrom(defaults.from);
      setDraftTo(defaults.to);
      onPresetChange("custom");
      return;
    }
    onPresetChange(next);
    setOpen(false);
  }

  function applyCustomRange() {
    const from = draftFrom || defaultCustomRange().from;
    const to = draftTo < from ? from : draftTo || from;
    setDraftFrom(from);
    setDraftTo(to);
    onCustomApply(from, to);
    setOpen(false);
  }

  const panel = open ? (
    <div
      ref={panelRef}
      style={panelStyle}
      className="rounded-xl border border-border bg-card p-2 shadow-lg"
    >
      <div className="space-y-1" role="listbox">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={preset === item.id}
            onClick={() => selectPreset(item.id)}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
              preset === item.id
                ? "bg-primary-subtle text-primary"
                : "text-foreground hover:bg-accent",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          <div>
            <label
              htmlFor="performance-from"
              className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              From
            </label>
            <input
              id="performance-from"
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label
              htmlFor="performance-to"
              className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              To
            </label>
            <input
              id="performance-to"
              type="date"
              value={draftTo}
              min={draftFrom}
              onChange={(e) => setDraftTo(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={applyCustomRange}
            disabled={!draftFrom || !draftTo}
            className="w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-[#008a43] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (next) {
              requestAnimationFrame(updatePanelPosition);
            }
            return next;
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{range.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}

export function PerformanceDateLabel({ range }: { range: DateRange }) {
  return (
    <span className="text-xs text-muted-foreground">{range.label}</span>
  );
}
