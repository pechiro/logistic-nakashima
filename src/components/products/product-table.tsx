"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { ProductListItem } from "@/lib/types";
import { formatCurrency, formatInt, isLowStock, stockStatus } from "@/lib/format";
import { StockGauge } from "@/components/stock-gauge";
import { StatusBadge } from "@/components/status-badge";

function HeaderCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`py-2.5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint ${className}`}
    >
      {children}
    </th>
  );
}

export function ProductTable({
  products,
  onEdit,
  onDelete,
}: {
  products: ProductListItem[];
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <HeaderCell className="pl-5 text-left">Producto</HeaderCell>
              <HeaderCell className="text-left">SKU</HeaderCell>
              <HeaderCell className="hidden text-left sm:table-cell">
                Categoría
              </HeaderCell>
              <HeaderCell className="text-left">En stock</HeaderCell>
              <HeaderCell className="text-right">Precio unitario</HeaderCell>
              <HeaderCell className="hidden text-right md:table-cell">
                Reordenar en
              </HeaderCell>
              <th className="w-14 py-2.5 pr-4">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const low = isLowStock(product.quantity, product.reorderLevel);
              const out =
                stockStatus(product.quantity, product.reorderLevel) === "out";
              return (
                <tr
                  key={product.id}
                  data-low={low}
                  className="group border-b border-line transition-colors last:border-0 hover:bg-surface-2 data-[low=true]:bg-low-weak/50 data-[low=true]:hover:bg-low-weak"
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
                    <div className="font-medium text-ink">{product.name}</div>
                    {product.description && (
                      <div
                        className="mt-0.5 max-w-[22rem] truncate text-xs text-ink-faint"
                        title={product.description}
                      >
                        {product.description}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <span className="font-mono text-[12.5px] text-ink-muted">
                      {product.sku}
                    </span>
                  </td>
                  <td className="hidden py-3 pr-3 sm:table-cell">
                    <span className="inline-flex items-center rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
                      {product.category}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-[3rem]">
                        <div className="font-display text-[15px] font-semibold leading-none tabular-nums text-ink">
                          {formatInt(product.quantity)}
                        </div>
                        <StockGauge
                          quantity={product.quantity}
                          reorderLevel={product.reorderLevel}
                          className="mt-1.5"
                        />
                      </div>
                      <StatusBadge
                        quantity={product.quantity}
                        reorderLevel={product.reorderLevel}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right font-medium tabular-nums text-ink">
                    {formatCurrency(product.unitPrice)}
                  </td>
                  <td className="hidden py-3 pr-5 text-right tabular-nums text-ink-muted md:table-cell">
                    {formatInt(product.reorderLevel)}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        className="icon-btn"
                        aria-label={`Editar ${product.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(product)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-out-weak hover:text-out"
                        aria-label={`Eliminar ${product.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
