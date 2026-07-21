"use client";

import { useState } from "react";
import { Camera, FolderKanban, Loader2, Pencil, Trash2, Wrench } from "lucide-react";
import type { ProductDeployment, ProductListItem, ProductRow } from "@/lib/types";
import { formatCurrency, formatInt, isLowStock, stockStatus } from "@/lib/format";
import { updateProductImage } from "@/app/products/actions";
import { StockGauge } from "@/components/stock-gauge";
import { StatusBadge } from "@/components/status-badge";

// Client-side pre-check; the server enforces the real cap (MAX_IMAGE_BYTES in
// src/lib/supabase-storage.ts, which is server-only).
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

/**
 * Left edge accent: red when out, amber when low, nothing when healthy.
 * Directional (`border-l-*`) on purpose — the mobile card also sets `border-line`
 * for its bottom rule, and two generic `border-color` utilities would collide,
 * with the winner decided by stylesheet order rather than class order.
 */
function accentClass(quantity: number, reorderLevel: number): string {
  const status = stockStatus(quantity, reorderLevel);
  if (status === "out") return "border-l-out";
  if (status === "low") return "border-l-low-bar";
  return "border-l-transparent";
}

/** A product's reference photo, sized for a row; opens full size in a new tab. */
function Thumbnail({ url, alt }: { url: string; alt: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0"
      title="Ver imagen en otra pestaña"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="h-10 w-10 rounded-md border border-line bg-surface-2 object-cover"
      />
    </a>
  );
}

/**
 * Quick "camera" action on a row: opens the device camera or gallery, uploads
 * the photo, and attaches it to this product — no full edit form. On mobile the
 * `capture` hint points at the rear camera for photographing stock on the spot.
 */
function RowImageButton({
  product,
  onResult,
}: {
  product: ProductRow;
  onResult: (message: string, ok: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onResult("El archivo debe ser una imagen.", false);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onResult("La imagen supera el límite de 8 MB.", false);
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const outcome = await updateProductImage(product.id, data);
      onResult(
        outcome.ok ? `Foto actualizada para ${product.name}.` : outcome.error,
        outcome.ok,
      );
    } catch {
      onResult("No se pudo actualizar la imagen.", false);
    } finally {
      setUploading(false);
    }
  }

  return (
    <label
      className={`icon-btn cursor-pointer ${uploading ? "pointer-events-none opacity-55" : ""}`}
      title={product.imageUrl ? "Actualizar foto" : "Agregar foto"}
      aria-label={`${product.imageUrl ? "Actualizar" : "Agregar"} foto de ${product.name}`}
    >
      {uploading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Camera size={15} />
      )}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={uploading}
        onChange={onChange}
      />
    </label>
  );
}

/** Secondary-classification chip (Soporte / ACI / DACI / custom). */
function SpecialtyTag({ specialty }: { specialty: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
      <Wrench size={11} strokeWidth={2} className="shrink-0 text-ink-faint" />
      {specialty}
    </span>
  );
}

/**
 * The active projects this product is currently out on. This is the visual
 * cue for the unified search: a match that is dispatched to a project shows
 * where — and how much — instead of looking like plain warehouse stock.
 */
function DeploymentBadges({ deployments }: { deployments: ProductDeployment[] }) {
  if (deployments.length === 0) return null;
  const MAX = 2;
  const shown = deployments.slice(0, MAX);
  const extra = deployments.length - shown.length;
  return (
    <>
      {shown.map((d) => (
        <span
          key={d.projectId}
          title={`${d.projectName} · ${formatInt(d.quantity)} en obra`}
          className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-weak px-2 py-0.5 text-[11px] font-medium text-accent"
        >
          <FolderKanban size={11} strokeWidth={2} className="shrink-0" />
          <span className="max-w-[9rem] truncate">{d.projectName}</span>
          <span className="tabular-nums opacity-75">· {formatInt(d.quantity)}</span>
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[11px] font-medium text-ink-faint">+{extra} más</span>
      )}
    </>
  );
}

function EditButton({
  product,
  onEdit,
}: {
  product: ProductListItem;
  onEdit: (product: ProductListItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(product)}
      className="icon-btn"
      aria-label={`Editar ${product.name}`}
    >
      <Pencil size={15} />
    </button>
  );
}

function DeleteButton({
  product,
  onDelete,
}: {
  product: ProductListItem;
  onDelete: (product: ProductListItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onDelete(product)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-out-weak hover:text-out"
      aria-label={`Eliminar ${product.name}`}
    >
      <Trash2 size={15} />
    </button>
  );
}

/**
 * Two presentations of the same list. Below `md` the table needs far more width
 * than a ~350px phone card has, which pushed columns off-screen behind a
 * sideways scroll — so phones get stacked cards that fit the viewport and scroll
 * vertically only. From `md` up there is room for the table, which is far easier
 * to scan across many rows.
 */
export function ProductTable({
  products,
  onEdit,
  onDelete,
  onImageResult,
}: {
  products: ProductRow[];
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
  onImageResult: (message: string, ok: boolean) => void;
}) {
  return (
    <div className="card overflow-hidden">
      {/* Phones: one card per product. */}
      <ul className="md:hidden">
        {products.map((product) => {
          const low = isLowStock(product.quantity, product.reorderLevel);
          return (
            <li
              key={product.id}
              data-low={low}
              className={`border-b border-l-[3px] border-line p-4 last:border-b-0 data-[low=true]:bg-low-weak/50 ${accentClass(
                product.quantity,
                product.reorderLevel,
              )}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {product.imageUrl && (
                    <Thumbnail url={product.imageUrl} alt={product.name} />
                  )}
                  <div className="min-w-0">
                    <p className="break-words font-medium text-ink">{product.name}</p>
                    <p className="mt-0.5 truncate font-mono text-[12px] text-ink-muted">
                      {product.sku}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusBadge
                    quantity={product.quantity}
                    reorderLevel={product.reorderLevel}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display text-[15px] font-semibold leading-none tabular-nums text-ink">
                    {formatInt(product.quantity)}
                  </div>
                  <StockGauge
                    quantity={product.quantity}
                    reorderLevel={product.reorderLevel}
                    className="mt-1.5"
                  />
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-medium tabular-nums text-ink">
                    {formatCurrency(product.unitPrice)}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-faint tabular-nums">
                    Reordenar en {formatInt(product.reorderLevel)}
                  </div>
                </div>
              </div>

              {/* Classification tags: category, specialty, and measure. */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="min-w-0 max-w-full truncate rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
                  {product.category}
                </span>
                {product.specialty && <SpecialtyTag specialty={product.specialty} />}
                {product.measure && (
                  <span className="inline-flex items-center rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
                    Medida: {product.measure}
                  </span>
                )}
              </div>

              {/* Project deployments, only when present. */}
              {product.deployments.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <DeploymentBadges deployments={product.deployments} />
                </div>
              )}

              <div className="mt-3 flex items-center justify-end gap-1">
                <RowImageButton product={product} onResult={onImageResult} />
                <EditButton product={product} onEdit={onEdit} />
                <DeleteButton product={product} onDelete={onDelete} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* md and up: the full table. `relative` is load-bearing — .sr-only is
          position:absolute, and an absolutely-positioned element is only clipped
          by an overflow ancestor that is itself positioned. Without it that
          label escapes this scroller and stretches the *document* to its static
          x inside the table, which is what slid the whole page sideways. */}
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <HeaderCell className="pl-5 text-left">Producto</HeaderCell>
              <HeaderCell className="text-left">SKU</HeaderCell>
              <HeaderCell className="text-left">Categoría</HeaderCell>
              <HeaderCell className="text-left">Medida</HeaderCell>
              <HeaderCell className="text-left">En stock</HeaderCell>
              <HeaderCell className="text-right">Precio unitario</HeaderCell>
              <HeaderCell className="hidden text-right lg:table-cell">
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
              return (
                <tr
                  key={product.id}
                  data-low={low}
                  className="group border-b border-line transition-colors last:border-0 hover:bg-surface-2 data-[low=true]:bg-low-weak/50 data-[low=true]:hover:bg-low-weak"
                >
                  <td
                    className={`border-l-[3px] py-3 pl-5 pr-3 ${accentClass(
                      product.quantity,
                      product.reorderLevel,
                    )}`}
                  >
                    <div className="flex items-start gap-3">
                      {product.imageUrl && (
                        <Thumbnail url={product.imageUrl} alt={product.name} />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-ink">{product.name}</div>
                        {product.description && (
                          <div
                            className="mt-0.5 max-w-[22rem] truncate text-xs text-ink-faint"
                            title={product.description}
                          >
                            {product.description}
                          </div>
                        )}
                        {product.deployments.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <DeploymentBadges deployments={product.deployments} />
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="font-mono text-[12.5px] text-ink-muted">
                      {product.sku}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-col items-start gap-1">
                      <span className="inline-flex items-center rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
                        {product.category}
                      </span>
                      {product.specialty && (
                        <SpecialtyTag specialty={product.specialty} />
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-ink-muted">
                    {product.measure ? (
                      product.measure
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
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
                  <td className="hidden py-3 pr-5 text-right tabular-nums text-ink-muted lg:table-cell">
                    {formatInt(product.reorderLevel)}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      <RowImageButton product={product} onResult={onImageResult} />
                      <EditButton product={product} onEdit={onEdit} />
                      <DeleteButton product={product} onDelete={onDelete} />
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
