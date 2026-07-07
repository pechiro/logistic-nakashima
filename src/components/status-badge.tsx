import { stockStatus } from "@/lib/format";

/** "Low stock" (at/below reorder) or the more urgent "Out of stock" (zero).
 * Renders nothing when stock is healthy. */
export function StatusBadge({
  quantity,
  reorderLevel,
  className = "",
}: {
  quantity: number;
  reorderLevel: number;
  className?: string;
}) {
  const status = stockStatus(quantity, reorderLevel);
  if (status === "healthy") return null;
  const out = status === "out";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] ${
        out ? "bg-out-weak text-out" : "bg-low-weak text-low"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${out ? "bg-out" : "bg-low-bar"}`}
      />
      {out ? "Out of stock" : "Low stock"}
    </span>
  );
}
