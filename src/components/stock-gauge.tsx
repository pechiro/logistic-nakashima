import { gaugeFill, stockStatus } from "@/lib/format";

/**
 * The signature element: a compact bar showing stock relative to its reorder
 * threshold. The notch marks the reorder level (the full bar is twice that),
 * so "below the notch" reads as low at a glance — before you read the number.
 */
export function StockGauge({
  quantity,
  reorderLevel,
  className = "",
}: {
  quantity: number;
  reorderLevel: number;
  className?: string;
}) {
  const status = stockStatus(quantity, reorderLevel);
  const color =
    status === "out"
      ? "var(--color-out)"
      : status === "low"
        ? "var(--color-low-bar)"
        : "var(--color-ok)";
  // Keep a visible sliver for any nonzero count.
  const width = quantity > 0 ? Math.max(gaugeFill(quantity, reorderLevel) * 100, 8) : 0;

  return (
    <div
      className={`relative h-2 w-20 ${className}`}
      role="img"
      aria-label={`${quantity} en stock; reordenar en ${reorderLevel}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      {reorderLevel > 0 && (
        <span
          aria-hidden
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 rounded-full bg-ink/30"
          style={{ left: "50%" }}
        />
      )}
    </div>
  );
}
