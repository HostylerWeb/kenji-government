"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKsh } from "@/lib/utils";

export type GgrTrendPoint = {
  month: string;
  ggr: number;
  tax: number;
};

export type StatusSlice = {
  name: string;
  value: number;
  color: string;
};

function formatAxisMillions(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export function GgrTaxTrendChart({ data }: { data: GgrTrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No trend data available yet.
      </p>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ggrGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00A551" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#00A551" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="taxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A365D" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#1A365D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--color-border))" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--color-muted-foreground))", fontSize: 12 }}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--color-muted-foreground))", fontSize: 12 }}
            tickMargin={8}
            tickFormatter={formatAxisMillions}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatKsh(value),
              name === "ggr" ? "GGR" : "Tax Collected",
            ]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--color-border))",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">
                {value === "ggr" ? "GGR" : "Tax Collected"}
              </span>
            )}
          />
          <Area
            type="monotone"
            dataKey="ggr"
            name="ggr"
            stroke="#00A551"
            strokeWidth={2}
            fill="url(#ggrGradient)"
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="tax"
            name="tax"
            stroke="#1A365D"
            strokeWidth={2}
            fill="url(#taxGradient)"
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OperatorStatusDonut({ data }: { data: StatusSlice[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No operator status data.
      </p>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={78}
            paddingAngle={2}
            dataKey="value"
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, _name, item) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return [`${value} (${pct}%)`, item.payload.name];
            }}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--color-border))",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ComplianceBreakdownBar({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {data.map((item) => (
          <div
            key={item.name}
            style={{
              width: `${(item.value / total) * 100}%`,
              backgroundColor: item.color,
            }}
            className="transition-all duration-1000 ease-out"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <div>
              <p className="text-xs text-muted-foreground">{item.name}</p>
              <p className="text-sm font-medium tabular-nums">
                {item.value}{" "}
                <span className="text-xs text-muted-foreground">
                  ({Math.round((item.value / total) * 100)}%)
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
