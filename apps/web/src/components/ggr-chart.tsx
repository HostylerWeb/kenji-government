import { formatKsh } from "@/lib/utils";

export function GgrChart({
  data,
}: {
  data: Array<{ label: string; value: string }>;
}) {
  const max = Math.max(...data.map((d) => Number(d.value)), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = (Number(item.value) / max) * 100;
        return (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>{item.label}</span>
              <span>{formatKsh(item.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
