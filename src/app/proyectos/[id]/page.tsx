import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectDetailView } from "@/components/proyectos/project-detail-view";
import type { MaterialOption, ProjectMaterial } from "@/lib/types";

// Siempre leer el proyecto actual; los despachos revalidan esta ruta.
export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      items: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          quantityRequested: true,
          createdAt: true,
          product: { select: { name: true, sku: true } },
        },
      },
    },
  });

  if (!project) notFound();

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true, quantity: true },
  });

  const materials: ProjectMaterial[] = project.items.map((it) => ({
    id: it.id,
    productName: it.product.name,
    sku: it.product.sku,
    quantityRequested: it.quantityRequested,
    createdAt: it.createdAt.toISOString(),
  }));

  const options: MaterialOption[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    quantity: p.quantity,
  }));

  return (
    <ProjectDetailView
      project={{ id: project.id, name: project.name }}
      materials={materials}
      products={options}
    />
  );
}
