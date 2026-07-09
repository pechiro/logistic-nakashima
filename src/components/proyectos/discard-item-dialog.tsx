"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { discardProjectItem } from "@/app/proyectos/actions";
import type { ProjectMaterial } from "@/lib/types";

const noop = () => {};

/**
 * "Eliminar" a material from a project's registry when it was consumed or lost
 * on-site — it does NOT return stock to the warehouse (that already left on
 * dispatch). Destructive, so it confirms first. Mirrors the product DeleteDialog.
 */
export function DiscardItemDialog({
  open,
  material,
  onClose,
  onDiscarded,
}: {
  open: boolean;
  material: ProjectMaterial | null;
  onClose: () => void;
  onDiscarded: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Clear any stale error when the dialog opens or targets a different item —
  // done during render (React's recommended alternative to a setState-in-effect).
  const openKey = open && material ? material.id : null;
  const [prevOpenKey, setPrevOpenKey] = useState(openKey);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    setError(null);
  }

  function confirm() {
    if (!material || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await discardProjectItem(material.id);
      if (result.ok) onDiscarded(result.message);
      else setError(result.error);
    });
  }

  return (
    <Overlay
      open={open}
      onClose={pending ? noop : onClose}
      variant="center"
      labelledBy="discard-title"
      describedBy="discard-desc"
    >
      <div className="p-6">
        <div className="flex gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-out-weak text-out">
            <Trash2 size={20} />
          </span>
          <div className="min-w-0">
            <h2
              id="discard-title"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              ¿Eliminar del proyecto?
            </h2>
            <p id="discard-desc" className="mt-1 text-sm text-ink-muted">
              {material ? (
                <>
                  Esto elimina{" "}
                  <span className="font-medium text-ink">{material.productName}</span> (
                  <span className="font-mono text-[12.5px]">{material.sku}</span>) del
                  registro de este proyecto.{" "}
                  <span className="font-medium text-ink">
                    No se devolverá stock al almacén
                  </span>{" "}
                  — úsalo cuando el material se consumió o se perdió en obra.
                </>
              ) : null}
            </p>
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-out/30 bg-out-weak px-3 py-2 text-sm text-out"
              >
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            data-autofocus
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
            className="btn btn-danger"
          >
            {pending ? "Eliminando…" : "Eliminar del proyecto"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
