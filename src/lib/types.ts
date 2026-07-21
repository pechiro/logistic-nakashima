/** The product fields the UI needs. Kept free of Date/Decimal so it serializes
 * cleanly from server components to client components. */
export type ProductListItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  // Secondary classification (Soporte / ACI / DACI / custom). Null when unset.
  specialty: string | null;
  // Physical size / measure, e.g. 2", 1/2", 4". Null when unset.
  measure: string | null;
  // URL to an external reference image. Null when unset.
  imageUrl: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  reorderLevel: number;
};

/** One active project a product is currently dispatched to, with how much of it
 * is out there. Summed across every ProjectItem for that product+project. */
export type ProductDeployment = {
  projectId: string;
  projectName: string;
  quantity: number;
};

/** A product row for the Productos page: the base fields plus the active-project
 * deployments used by the unified search and the "en obra" indicator. */
export type ProductRow = ProductListItem & {
  deployments: ProductDeployment[];
};

// "IN"/"OUT" are plain warehouse Entrada/Salida; "RETURN" (Devolución) is stock
// coming back from a project — inbound like IN, but labelled distinctly.
export type MovementType = "IN" | "OUT" | "RETURN";

// -- Proyectos ---------------------------------------------------------------

/** A project is ACTIVE until someone marks it finished; COMPLETED is reversible. */
export type ProjectStatus = "ACTIVE" | "COMPLETED";

/**
 * Narrow a raw `Project.status` from the database into the union the UI expects.
 * Anything that isn't exactly "COMPLETED" — null, an empty string, a value a
 * future migration adds — reads as ACTIVE, so a project can never vanish from
 * the list just because its status is unrecognised.
 *
 * This does NOT protect against the `status` column being absent: Postgres
 * rejects the whole SELECT (Prisma P2022) before any row reaches this function.
 * The column has to exist; see `prisma db push`.
 */
export function toProjectStatus(value: string | null | undefined): ProjectStatus {
  return value === "COMPLETED" ? "COMPLETED" : "ACTIVE";
}

/** A project row for the list view, with how many materials it has dispatched. */
export type ProjectListItem = {
  id: string;
  name: string;
  status: ProjectStatus;
  completedAt: string | null; // ISO — kept as string so it serializes to the client
  itemCount: number;
  totalDispatched: number;
};

/** Minimal project identity passed to the detail view. */
export type ProjectSummary = { id: string; name: string; status: ProjectStatus };

/** One material dispatched to a project (a ProjectItem joined to its product). */
export type ProjectMaterial = {
  id: string;
  productName: string;
  sku: string;
  quantityRequested: number;
  createdAt: string; // ISO — kept as string so it serializes to the client
};

/** A warehouse product offered in the "Asignar Materiales" dropdown. */
export type MaterialOption = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
};
