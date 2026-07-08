import { Boxes, CircleDollarSign, Package, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatInt, isLowStock } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { CategoryChart, type CategoryTotal } from "@/components/dashboard/category-chart";

// Always reflect the current inventory; mutations revalidate the source pages.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const products = await prisma.product.findMany({
    select: {
      category: true,
      quantity: true,
      unitPrice: true,
      reorderLevel: true,
    },
  });

  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  const lowStockCount = products.filter((p) => isLowStock(p.quantity, p.reorderLevel)).length;

  // Total stock quantity per category, largest first.
  const byCategory = new Map<string, number>();
  for (const p of products) {
    byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + p.quantity);
  }
  const categoryTotals: CategoryTotal[] = Array.from(byCategory, ([category, quantity]) => ({
    category,
    quantity,
  })).sort((a, b) => b.quantity - a.quantity || a.category.localeCompare(b.category));

  return (
    <>
      <PageHeader eyebrow="Resumen" title="Panel de Control" />

      <div className="px-5 py-6 lg:px-8">
        {totalProducts === 0 ? (
          <EmptyState
            icon={<Package size={22} />}
            title="Aún no hay productos"
            body="Añade productos en la página de Productos y tus métricas de inventario aparecerán aquí."
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label="Productos"
                value={formatInt(totalProducts)}
                hint={`${categoryTotals.length} ${categoryTotals.length === 1 ? "categoría" : "categorías"}`}
                icon={Package}
              />
              <StatCard
                label="Valor del inventario"
                value={formatCurrency(totalValue)}
                hint="Cantidad × precio unitario"
                icon={CircleDollarSign}
                tone="ok"
              />
              <StatCard
                label="Stock bajo"
                value={formatInt(lowStockCount)}
                hint={lowStockCount === 0 ? "Todos los artículos saludables" : "En o por debajo del nivel de reorden"}
                icon={lowStockCount === 0 ? Boxes : TriangleAlert}
                tone={lowStockCount === 0 ? "ok" : "low"}
              />
            </div>

            <section className="card p-5 lg:p-6">
              <div className="mb-5">
                <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                  Inventario por categoría
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-muted">
                  Total de unidades disponibles en cada categoría.
                </p>
              </div>
              <CategoryChart data={categoryTotals} />
            </section>
          </div>
        )}
      </div>
    </>
  );
}
