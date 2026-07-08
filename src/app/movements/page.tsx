import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatInt } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { MovementTypeBadge } from "@/components/movements/movement-type-badge";
import type { MovementType } from "@/lib/types";

// Always read the latest log; stock adjustments revalidate this path.
export const dynamic = "force-dynamic";

const RECENT_LIMIT = 200;
const TH =
  "py-2.5 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint";

export default async function MovementsPage() {
  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: RECENT_LIMIT,
    include: { product: { select: { name: true, sku: true } } },
  });

  return (
    <>
      <PageHeader eyebrow="Almacén" title="Movimientos" />

      <div className="px-5 py-6 lg:px-8">
        {movements.length === 0 ? (
          <EmptyState
            icon={<History size={22} />}
            title="Aún no hay movimientos de stock"
            body="Usa Entrada / Salida de stock en la página de Inventario — cada cambio se registra aquí."
          />
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className={`${TH} pl-5 text-left`}>
                        Producto
                      </th>
                      <th scope="col" className={`${TH} text-left`}>
                        Tipo
                      </th>
                      <th scope="col" className={`${TH} text-right`}>
                        Cantidad
                      </th>
                      <th scope="col" className={`${TH} text-right`}>
                        Cantidad resultante
                      </th>
                      <th scope="col" className={`${TH} pr-5 text-right`}>
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const isIn = m.type === "IN";
                      return (
                        <tr
                          key={m.id}
                          className="border-b border-line last:border-0"
                        >
                          <td className="py-3 pl-5 pr-3">
                            <div className="font-medium text-ink">
                              {m.product.name}
                            </div>
                            <div className="mt-0.5 font-mono text-[12px] text-ink-muted">
                              {m.product.sku}
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            <div className="flex flex-col items-start gap-1">
                              <MovementTypeBadge type={m.type as MovementType} />
                              {m.note && (
                                <span className="rounded border border-accent/20 bg-accent-weak px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                  {m.note}
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className={`py-3 pr-3 text-right font-medium tabular-nums ${
                              isIn ? "text-ok" : "text-ink"
                            }`}
                          >
                            {isIn ? "+" : "−"}
                            {formatInt(m.amount)}
                          </td>
                          <td className="py-3 pr-3 text-right font-medium tabular-nums text-ink">
                            {formatInt(m.resultingQuantity)}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-5 text-right text-ink-muted">
                            {formatDateTime(m.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {movements.length === RECENT_LIMIT && (
              <p className="mt-3 text-xs text-ink-faint">
                Mostrando los {RECENT_LIMIT} movimientos más recientes.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
