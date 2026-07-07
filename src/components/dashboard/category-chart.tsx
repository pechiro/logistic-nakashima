import { formatInt } from "@/lib/format";

export type CategoryTotal = { category: string; quantity: number };

/** Horizontal bar chart of total stock quantity per category. Bars scale to the
 * largest category so the tallest reads as a full bar. Server-rendered, no JS. */
export function CategoryChart({ data }: { data: CategoryTotal[] }) {
  const max = data.reduce((m, d) => Math.max(m, d.quantity), 0) || 1;

  return (
    <ul className="space-y-3.5">
      {data.map((d) => {
        const width = Math.max((d.quantity / max) * 100, d.quantity > 0 ? 2 : 0);
        return (
          <li key={d.category} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-[13px] text-ink-muted" title={d.category}>
              {d.category}
            </span>
            <div className="h-6 flex-1 overflow-hidden rounded-md bg-surface-2">
              <div
                className="h-full rounded-md bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-sm font-medium text-ink tabular-nums">
              {formatInt(d.quantity)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
