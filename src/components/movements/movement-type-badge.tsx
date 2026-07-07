import { ArrowDown, ArrowUp } from "lucide-react";
import type { MovementType } from "@/lib/types";

/** "In" (added stock) reads emerald; "Out" (removed stock) reads neutral — a
 * reduction isn't an error, so it shouldn't shout red. */
export function MovementTypeBadge({ type }: { type: MovementType }) {
  const isIn = type === "IN";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] ${
        isIn ? "bg-ok-weak text-ok-ink" : "bg-surface-2 text-ink-muted"
      }`}
    >
      {isIn ? (
        <ArrowUp size={12} strokeWidth={2.6} />
      ) : (
        <ArrowDown size={12} strokeWidth={2.6} />
      )}
      {isIn ? "In" : "Out"}
    </span>
  );
}
