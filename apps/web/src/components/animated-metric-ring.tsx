"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedMetricRingProps {
  value: number;
  label: string;
  subLabel?: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  displayValue?: string;
  max?: number;
}

export function AnimatedMetricRing({
  value,
  label,
  subLabel,
  color = "#00A551",
  size = 120,
  strokeWidth = 8,
  className,
  displayValue,
  max = 100,
}: AnimatedMetricRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(max, value));
  const progress = max > 0 ? (clamped / max) * 100 : 0;
  const offset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedValue(progress), 80);
    return () => clearTimeout(timeout);
  }, [progress]);

  const centerText =
    displayValue ??
    `${Math.round(animatedValue)}%`;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--color-border))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {centerText}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {subLabel && (
          <p className="text-[10px] text-muted-foreground">{subLabel}</p>
        )}
      </div>
    </div>
  );
}
