"use client";

import { useCallback, useMemo, useState } from "react";
import { PackageSearch, Search } from "lucide-react";
import type { ProductListItem } from "@/lib/types";
import { formatInt, isLowStock, stockStatus } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StockGauge } from "@/components/stock-gauge";
import { StatusBadge } from "@/components/status-badge";
import { Toast } from "@/components/toast";
import { StockAdjustControls } from "./stock-adjust-controls";

type ToastState = { id: number; message: string; variant: "success" | "error" };

const TH =
  "py-2.5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint";

export function StockView({ products }: { products: ProductListItem[] }) {
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const lowCount = useMemo(
    () => products.filter((p) => isLowStock(p.quantity, p.reorderLevel)).length,
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (lowOnly && !isLowStock(p.quantity, p.reorderLevel)) return false;
      if (q && !`${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [products, query, lowOnly]);

  const notify = useCallback(
    (message: string, variant: "success" | "error") =>
      setToast({ id: Date.now(), message, variant }),
    [],
  );
  const dismiss = useCallback(() => setToast(null), []);

  const hasProducts = products.length > 0;

  return (
    <>
      <PageHeader eyebrow="Almacén" title="Inventario" />

      <div className="px-5 py-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-sm text-ink-muted">
            <span>
              <strong className="font-display text-ink tabular-nums">
                {products.length}
              </strong>{" "}
              {products.length === 1 ? "producto" : "productos"}
            </span>
            {lowCount > 0 && (
              <>
                <span className="text-line-strong" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => setLowOnly((v) => !v)}
                  aria-pressed={lowOnly}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    lowOnly
                      ? "border-low-bar/40 bg-low-weak text-low"
                      : "border-line bg-surface text-ink-muted hover:bg-surface-2"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-low-bar"
                    aria-hidden
                  />
                  {lowCount} bajos
                </button>
              </>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              className="input h-9 w-full pl-8"
            />
          </div>
        </div>

        {!hasProducts ? (
          <EmptyState
            icon={<PackageSearch size={22} />}
            title="Aún no hay productos"
            body="Agrega productos en la página de Productos y luego ajusta su stock aquí."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<PackageSearch size={22} />}
            title="Ningún producto coincide"
            body="Prueba con otra búsqueda o quita el filtro de stock bajo."
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className={`${TH} pl-5 text-left`}>
                      Producto
                    </th>
                    <th scope="col" className={`${TH} text-left`}>
                      En stock
                    </th>
                    <th scope="col" className={`${TH} pr-5 text-right`}>
                      Ajustar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const low = isLowStock(p.quantity, p.reorderLevel);
                    const out = stockStatus(p.quantity, p.reorderLevel) === "out";
                    return (
                      <tr
                        key={p.id}
                        data-low={low}
                        className="border-b border-line transition-colors last:border-0 hover:bg-surface-2 data-[low=true]:bg-low-weak/50 data-[low=true]:hover:bg-low-weak"
                      >
                        <td
                          className={`border-l-[3px] py-3 pl-5 pr-3 ${
                            out
                              ? "border-out"
                              : low
                                ? "border-low-bar"
                                : "border-transparent"
                          }`}
                        >
                          <div className="font-medium text-ink">{p.name}</div>
                          <div className="mt-0.5 font-mono text-[12px] text-ink-muted">
                            {p.sku}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="min-w-[3rem]">
                              <div className="font-display text-[15px] font-semibold leading-none tabular-nums text-ink">
                                {formatInt(p.quantity)}
                              </div>
                              <StockGauge
                                quantity={p.quantity}
                                reorderLevel={p.reorderLevel}
                                className="mt-1.5"
                              />
                            </div>
                            <StatusBadge
                              quantity={p.quantity}
                              reorderLevel={p.reorderLevel}
                            />
                          </div>
                        </td>
                        <td className="py-3 pr-5">
                          <StockAdjustControls
                            productId={p.id}
                            name={p.name}
                            quantity={p.quantity}
                            onResult={notify}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={dismiss}
        />
      )}
    </>
  );
}
