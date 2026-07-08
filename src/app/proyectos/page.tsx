import { prisma } from "@/lib/prisma";
import { ProyectosView } from "@/components/proyectos/proyectos-view";
import type { ProjectListItem } from "@/lib/types";

// Siempre leer los proyectos actuales; las mutaciones revalidan esta ruta.
export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      items: { select: { quantityRequested: true } },
    },
  });

  const list: ProjectListItem[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    itemCount: p.items.length,
    totalDispatched: p.items.reduce((sum, it) => sum + it.quantityRequested, 0),
  }));

  return <ProyectosView projects={list} />;
}
