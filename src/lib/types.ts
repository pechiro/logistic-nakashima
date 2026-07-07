/** The product fields the UI needs. Kept free of Date/Decimal so it serializes
 * cleanly from server components to client components. */
export type ProductListItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
  reorderLevel: number;
};

export type MovementType = "IN" | "OUT";
