"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CountyBarChart({
  data,
  dataKey,
  label,
  color = "#1B7F4E",
}: {
  data: Array<{ county: string; count?: number; annual_ggr?: number }>;
  dataKey: "count" | "annual_ggr";
  label: string;
  color?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No data for this period.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="county"
            tick={{ fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={dataKey} name={label} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StakeBandChart({
  data,
  color = "#0B3D91",
}: {
  data: Array<{ band: string; count: number }>;
  color?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No stake band data.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="band" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" name="Sessions" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PeakTimeHeatmap({
  matrix,
  dayLabels,
}: {
  matrix: Record<string, number[]>;
  dayLabels: string[];
}) {
  const max = Object.values(matrix).reduce((peak, hours) => {
    for (const value of hours) {
      if (value > peak) return value;
    }
    return peak;
  }, 0);

  if (max === 0) {
    return <p className="text-sm text-muted">No peak-time data for this period.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr>
            <th className="py-1 pr-2 text-left text-muted">Day</th>
            {Array.from({ length: 24 }, (_, hour) => (
              <th key={hour} className="px-0.5 py-1 text-center text-muted">
                {hour}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(matrix).map(([dayIndex, hours]) => (
            <tr key={dayIndex}>
              <td className="py-1 pr-2 text-muted">
                {dayLabels[Number(dayIndex)] ?? dayIndex}
              </td>
              {hours.map((value, hour) => {
                const intensity = value / max;
                return (
                  <td key={hour} className="p-0.5">
                    <div
                      className="h-5 rounded-sm"
                      title={`${value} sessions`}
                      style={{
                        backgroundColor: `rgba(27, 127, 78, ${0.15 + intensity * 0.85})`,
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">Hour of day (UTC) × day of week</p>
    </div>
  );
}
