"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { deleteProduct } from "@/app/products/actions";
import type { ProductListItem } from "@/lib/types";

const noop = () => {};

export function DeleteDialog({
  open,
  product,
  onClose,
  onDeleted,
}: {
  open: boolean;
  product: ProductListItem | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Clear any stale error when the dialog opens or targets a different product,
  // so a previous failure never shows against the wrong item. Done during render
  // by comparing against the previously rendered target — the recommended
  // alternative to a setState-in-effect.
  const openKey = open ? (product?.id ?? "") : null;
  const [prevOpenKey, setPrevOpenKey] = useState(openKey);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    setError(null);
  }

  function confirm() {
    if (!product) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.ok) onDeleted(result.message);
      else setError(result.message);
    });
  }

  return (
    <Overlay
      open={open}
      onClose={pending ? noop : onClose}
      variant="center"
      labelledBy="delete-title"
      describedBy="delete-desc"
    >
      <div className="p-6">
        <div className="flex gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-out-weak text-out">
            <TriangleAlert size={20} />
          </span>
          <div className="min-w-0">
            <h2
              id="delete-title"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              ¿Eliminar este producto?
            </h2>
            <p id="delete-desc" className="mt-1 text-sm text-ink-muted">
              {product ? (
                <>
                  Esto elimina{" "}
                  <span className="font-medium text-ink">{product.name}</span> (
                  <span className="font-mono text-[12.5px]">{product.sku}</span>)
                  de tu inventario. No podrás deshacer esta acción.
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
            Conservar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="btn btn-danger"
          >
            {pending ? "Eliminando…" : "Eliminar producto"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
