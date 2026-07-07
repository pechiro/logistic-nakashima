import { prisma } from "@/lib/prisma";
import { StockView } from "@/components/stock/stock-view";

// Always read current quantities; stock adjustments revalidate this path.
export const dynamic = "force-dynamic";

export default async function StockPage() {
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

  return <StockView products={products} />;
}
