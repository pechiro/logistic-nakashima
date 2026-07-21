import { prisma } from "@/lib/prisma";
import { ProductsView } from "@/components/products/products-view";
import type { ProductDeployment, ProductRow } from "@/lib/types";

// Always read the current inventory; mutations revalidate this path.
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      specialty: true,
      measure: true,
      imageUrl: true,
      description: true,
      quantity: true,
      unitPrice: true,
      reorderLevel: true,
      // Current deployments to ACTIVE projects, so search can match by project
      // name and each row can show where the material is out on site.
      projectItems: {
        where: { project: { status: "ACTIVE" } },
        select: {
          quantityRequested: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  });

  const rows: ProductRow[] = products.map(({ projectItems, ...product }) => {
    // A product can have several ProjectItem rows for the same project (each
    // dispatch adds one); fold them into one entry per project with the total.
    const byProject = new Map<string, ProductDeployment>();
    for (const item of projectItems) {
      const existing = byProject.get(item.project.id);
      if (existing) {
        existing.quantity += item.quantityRequested;
      } else {
        byProject.set(item.project.id, {
          projectId: item.project.id,
          projectName: item.project.name,
          quantity: item.quantityRequested,
        });
      }
    }
    const deployments = Array.from(byProject.values()).sort((a, b) =>
      a.projectName.localeCompare(b.projectName),
    );
    return { ...product, deployments };
  });

  const categories = Array.from(new Set(products.map((p) => p.category))).sort(
    (a, b) => a.localeCompare(b),
  );

  return <ProductsView products={rows} categories={categories} />;
}
