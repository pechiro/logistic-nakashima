"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, PackagePlus, Undo2 } from "lucide-react";
import type { MaterialOption, ProjectMaterial, ProjectSummary } from "@/lib/types";
import { formatDateTime, formatInt } from "@/lib/format";
import { assignMaterial } from "@/app/proyectos/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Toast } from "@/components/toast";
import { ReturnDialog } from "./return-dialog";

type ToastState = { id: number; message: string; variant: "success" | "error" };

const TH =
  "py-2.5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint";

export function ProjectDetailView({
  project,
  materials,
  products,
}: {
  project: ProjectSummary;
  materials: ProjectMaterial[];
  products: MaterialOption[];
}) {
  const [productId, setProductId] = useState("");
  const [amount, setAmount] = useState("1");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState | null>(null);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<ProjectMaterial | null>(null);

  const dismiss = useCallback(() => setToast(null), []);
  const notify = (message: string, variant: "success" | "error") =>
    setToast({ id: Date.now(), message, variant });

  const askReturn = useCallback((material: ProjectMaterial) => {
    setReturnTarget(material);
    setReturnOpen(true);
  }, []);
  const closeReturn = useCallback(() => setReturnOpen(false), []);
  const onReturned = useCallback((message: string) => {
    setReturnOpen(false);
    setToast({ id: Date.now(), message, variant: "success" });
  }, []);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const hasProducts = products.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!productId) {
      notify("Selecciona un material.", "error");
      return;
    }
    const value = Math.trunc(Number(amount));
    if (!Number.isFinite(value) || value <= 0) {
      notify("Ingresa una cantidad mayor que cero.", "error");
      return;
    }
    startTransition(async () => {
      const result = await assignMaterial(project.id, productId, value);
      if (result.ok) {
        notify(result.message, "success");
        setAmount("1");
        setProductId("");
      } else {
        notify(result.error, "error");
      }
    });
  }

  return (
    <>
      <PageHeader eyebrow="Proyecto" title={project.name}>
        <Link href="/proyectos" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Proyectos</span>
        </Link>
      </PageHeader>

      <div className="space-y-6 px-5 py-6 lg:px-8">
        <section className="card p-5 lg:p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            Asignar Materiales
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            Descuenta la cantidad del stock del almacén y la registra en Movimientos como salida.
          </p>

          {!hasProducts ? (
            <p className="mt-4 text-sm text-ink-muted">
              No hay productos en el almacén. Agrega productos en la página de Productos primero.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="material" className="field-label">
                  Material
                </label>
                <select
                  id="material"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="input w-full"
                >
                  <option value="" disabled>
                    Selecciona un material…
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                      {p.name} ({p.sku}) — {p.quantity} en stock
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-32">
                <label htmlFor="qty" className="field-label">
                  Cantidad
                </label>
                <input
                  id="qty"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={selected ? selected.quantity : undefined}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input tnum w-full"
                />
              </div>
              <button
                type="submit"
                disabled={pending || !productId}
                className="btn btn-primary"
              >
                <PackagePlus size={16} />
                {pending ? "Asignando…" : "Asignar"}
              </button>
            </form>
          )}

          {selected && (
            <p className="mt-2 text-xs text-ink-faint">
              Disponible: {formatInt(selected.quantity)} en stock.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight text-ink">
            Materiales asignados
          </h2>
          {materials.length === 0 ? (
            <EmptyState
              icon={<PackagePlus size={22} />}
              title="Aún no hay materiales asignados"
              body="Usa el formulario de arriba para despachar materiales del almacén a este proyecto."
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={`${TH} pl-5 text-left`}>
                        Material
                      </th>
                      <th scope="col" className={`${TH} text-right`}>
                        Cantidad
                      </th>
                      <th scope="col" className={`${TH} text-right`}>
                        Fecha
                      </th>
                      <th scope="col" className={`${TH} pr-5 text-right`}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => (
                      <tr key={m.id} className="border-b border-line last:border-0">
                        <td className="py-3 pl-5 pr-3">
                          <div className="font-medium text-ink">{m.productName}</div>
                          <div className="mt-0.5 font-mono text-[12px] text-ink-muted">
                            {m.sku}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-right font-medium tabular-nums text-ink">
                          {formatInt(m.quantityRequested)}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-3 text-right text-ink-muted">
                          {formatDateTime(m.createdAt)}
                        </td>
                        <td className="py-3 pr-5 text-right">
                          <button
                            type="button"
                            onClick={() => askReturn(m)}
                            aria-label={`Devolver ${m.productName} al almacén`}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-2"
                          >
                            <Undo2 size={14} strokeWidth={2.4} />
                            <span className="hidden sm:inline">Devolver</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      <ReturnDialog
        open={returnOpen}
        material={returnTarget}
        onClose={closeReturn}
        onReturned={onReturned}
      />

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
