"use client";

import { useState, useTransition } from "react";
import { Undo2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { returnMaterial } from "@/app/proyectos/actions";
import { formatInt } from "@/lib/format";
import type { ProjectMaterial } from "@/lib/types";

const noop = () => {};

/**
 * "Devolver al Almacén" — returns some ("cierta cantidad") or all ("Todo") of a
 * material dispatched to a project back to warehouse stock. Defaults the amount
 * to the full assigned quantity; the user can lower it. Mirrors DeleteDialog:
 * the Overlay handles focus/Escape, and the parent keeps `material` set during
 * the exit animation.
 */
export function ReturnDialog({
  open,
  material,
  onClose,
  onReturned,
}: {
  open: boolean;
  material: ProjectMaterial | null;
  onClose: () => void;
  onReturned: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset the form when the dialog opens or targets a different assignment.
  // Done during render (not in an effect) by comparing the previous target —
  // the pattern React recommends over a setState-in-effect.
  const openKey = open && material ? material.id : null;
  const [prevOpenKey, setPrevOpenKey] = useState(openKey);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    setError(null);
    setAmount(material ? String(material.quantityRequested) : "");
  }

  const max = material?.quantityRequested ?? 0;

  function confirm() {
    if (!material || pending) return;
    const value = Math.trunc(Number(amount));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Ingresa una cantidad mayor que cero.");
      return;
    }
    if (value > max) {
      setError(`Solo puedes devolver hasta ${formatInt(max)}.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await returnMaterial(material.id, value);
      if (result.ok) onReturned(result.message);
      else setError(result.error);
    });
  }

  return (
    <Overlay
      open={open}
      onClose={pending ? noop : onClose}
      variant="center"
      labelledBy="return-title"
      describedBy="return-desc"
    >
      <div className="p-6">
        <div className="flex gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ok-weak text-ok-ink">
            <Undo2 size={20} />
          </span>
          <div className="min-w-0">
            <h2
              id="return-title"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              Devolver al Almacén
            </h2>
            <p id="return-desc" className="mt-1 text-sm text-ink-muted">
              {material ? (
                <>
                  Devuelve material de{" "}
                  <span className="font-medium text-ink">{material.productName}</span> (
                  <span className="font-mono text-[12.5px]">{material.sku}</span>) al
                  stock del almacén. Este proyecto tiene {formatInt(max)} asignado.
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="return-amount" className="field-label">
            Cantidad a devolver
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="return-amount"
              data-autofocus
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
              className="input tnum w-full"
            />
            <button
              type="button"
              onClick={() => setAmount(String(max))}
              disabled={pending}
              className="btn btn-secondary shrink-0"
            >
              Todo
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-out/30 bg-out-weak px-3 py-2 text-sm text-out"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="btn btn-primary"
          >
            {pending ? "Devolviendo…" : "Devolver al almacén"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
