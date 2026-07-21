import { prisma } from "@/lib/prisma";
import { ProyectosView } from "@/components/proyectos/proyectos-view";
import { toProjectStatus, type ProjectListItem } from "@/lib/types";

// Siempre leer los proyectos actuales; las mutaciones revalidan esta ruta.
export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const projects = await prisma.project.findMany({
    // La vista separa activos de finalizados; este orden solo fija el orden
    // *dentro* de cada grupo: los activos por antigüedad (createdAt asc, como
    // siempre) y los finalizados con el más reciente arriba (completedAt desc).
    orderBy: [{ completedAt: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      status: true,
      completedAt: true,
      items: { select: { quantityRequested: true } },
    },
  });

  const list: ProjectListItem[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: toProjectStatus(p.status),
    completedAt: p.completedAt?.toISOString() ?? null,
    itemCount: p.items.length,
    totalDispatched: p.items.reduce((sum, it) => sum + it.quantityRequested, 0),
  }));

  return <ProyectosView projects={list} />;
}
