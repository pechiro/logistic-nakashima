import { prisma } from "@/lib/prisma";
import { ProductsView } from "@/components/products/products-view";

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
      quantity: true,
      unitPrice: true,
      reorderLevel: true,
    },
  });

  const categories = Array.from(new Set(products.map((p) => p.category))).sort(
    (a, b) => a.localeCompare(b),
  );

  return <ProductsView products={products} categories={categories} />;
}
