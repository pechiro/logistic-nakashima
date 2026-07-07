import { z } from "zod";

export const productInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(120, "Keep the name under 120 characters."),
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required.")
    .max(40, "Keep the SKU under 40 characters.")
    .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, "Use letters, numbers, and hyphens only.")
    .transform((value) => value.toUpperCase()),
  category: z
    .string()
    .trim()
    .min(1, "Category is required.")
    .max(60, "Keep the category under 60 characters."),
  quantity: z.coerce
    .number({ error: "Enter a quantity." })
    .int("Enter a whole number.")
    .min(0, "Quantity can't be negative.")
    .max(1_000_000, "That quantity is too large."),
  unitPrice: z.coerce
    .number({ error: "Enter a unit price." })
    .min(0, "Price can't be negative.")
    .max(1_000_000, "That price is too large."),
  reorderLevel: z.coerce
    .number({ error: "Enter a reorder level." })
    .int("Enter a whole number.")
    .min(0, "Reorder level can't be negative.")
    .max(1_000_000, "That reorder level is too large."),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export type FieldErrors = Partial<
  Record<"name" | "sku" | "category" | "quantity" | "unitPrice" | "reorderLevel", string>
>;

/** Collapse a ZodError into one message per field (first wins). */
export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key as keyof FieldErrors] = issue.message;
    }
  }
  return errors;
}
