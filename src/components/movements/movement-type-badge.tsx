import { ArrowDown, ArrowUp, Undo2 } from "lucide-react";
import type { MovementType } from "@/lib/types";

/** "In" (added stock) and "Return" (came back from a project) both read emerald —
 * stock going up. "Out" (removed / dispatched) reads neutral: a reduction isn't
 * an error, so it shouldn't shout red. */
const STYLES: Record<
  MovementType,
  { label: string; className: string; Icon: typeof ArrowUp }
> = {
  IN: { label: "Entrada", className: "bg-ok-weak text-ok-ink", Icon: ArrowUp },
  RETURN: { label: "Devolución", className: "bg-ok-weak text-ok-ink", Icon: Undo2 },
  OUT: { label: "Salida", className: "bg-surface-2 text-ink-muted", Icon: ArrowDown },
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const style = STYLES[type] ?? STYLES.OUT;
  const { Icon } = style;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] ${style.className}`}
    >
      <Icon size={12} strokeWidth={2.6} />
      {style.label}
    </span>
  );
}
