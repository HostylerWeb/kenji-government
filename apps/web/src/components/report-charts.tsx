"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportPreviewChart } from "@/lib/api";

const PIE_COLORS = ["#0B3D91", "#1B7F4E", "#C0392B", "#F39C12", "#8E44AD", "#16A085"];

function formatTooltipValue(value: number) {
  if (value >= 1_000_000) return `Ksh ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `Ksh ${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function ReportPreviewChartView({ chart }: { chart: ReportPreviewChart }) {
  if (!chart.data.length) {
    return <p className="text-sm text-muted-foreground">No chart data for these filters.</p>;
  }

  if (chart.type === "pie") {
    const seriesKey = chart.series[0]?.key ?? "count";
    return (
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chart.data}
              dataKey={seriesKey}
              nameKey={chart.x_key}
              cx="50%"
              cy="50%"
              outerRadius={95}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {chart.data.map((_, index) => (
                <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === "line") {
    return (
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={chart.x_key} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatTooltipValue} />
            <Tooltip formatter={(value: number) => formatTooltipValue(value)} />
            <Legend />
            {chart.series.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={series.color ?? "#0B3D91"}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={chart.x_key}
            tick={{ fontSize: 11 }}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatTooltipValue} />
          <Tooltip formatter={(value: number) => formatTooltipValue(value)} />
          <Legend />
          {chart.series.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              fill={series.color ?? "#0B3D91"}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
