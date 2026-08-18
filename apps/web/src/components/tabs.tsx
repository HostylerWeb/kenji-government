import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 gap-1 overflow-x-auto rounded-lg bg-secondary p-1 [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4",
            active === tab.id
              ? "bg-white text-foreground shadow-sm"
              : "text-muted hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
