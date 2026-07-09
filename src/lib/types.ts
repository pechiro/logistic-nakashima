/** The product fields the UI needs. Kept free of Date/Decimal so it serializes
 * cleanly from server components to client components. */
export type ProductListItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  reorderLevel: number;
};

// "IN"/"OUT" are plain warehouse Entrada/Salida; "RETURN" (Devolución) is stock
// coming back from a project — inbound like IN, but labelled distinctly.
export type MovementType = "IN" | "OUT" | "RETURN";

// -- Proyectos ---------------------------------------------------------------

/** A project row for the list view, with how many materials it has dispatched. */
export type ProjectListItem = {
  id: string;
  name: string;
  itemCount: number;
  totalDispatched: number;
};

/** Minimal project identity passed to the detail view. */
export type ProjectSummary = { id: string; name: string };

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
