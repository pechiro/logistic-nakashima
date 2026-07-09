import { z } from "zod";

export const productInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "El nombre debe tener menos de 120 caracteres.")
    // Product names are stored uppercase (the form also forces it as you type),
    // so the catalog stays consistent and duplicate checks line up.
    .transform((value) => value.toUpperCase()),
  sku: z
    .string()
    .trim()
    .min(1, "El SKU es obligatorio.")
    .max(40, "El SKU debe tener menos de 40 caracteres.")
    .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, "Usa solo letras, números y guiones.")
    .transform((value) => value.toUpperCase()),
  category: z
    .string()
    .trim()
    .min(1, "La categoría es obligatoria.")
    .max(60, "La categoría debe tener menos de 60 caracteres."),
  // Optional notes. Empty/whitespace collapses to null so blank stays unset.
  description: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null),
    z.string().max(500, "Las notas deben tener menos de 500 caracteres.").nullable(),
  ),
  quantity: z.coerce
    .number({ error: "Ingresa una cantidad." })
    .int("Ingresa un número entero.")
    .min(0, "La cantidad no puede ser negativa.")
    .max(1_000_000, "Esa cantidad es demasiado grande."),
  unitPrice: z.coerce
    .number({ error: "Ingresa un precio unitario." })
    .min(0, "El precio no puede ser negativo.")
    .max(1_000_000, "Ese precio es demasiado grande."),
  reorderLevel: z.coerce
    .number({ error: "Ingresa un nivel de reorden." })
    .int("Ingresa un número entero.")
    .min(0, "El nivel de reorden no puede ser negativo.")
    .max(1_000_000, "Ese nivel de reorden es demasiado grande."),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export type FieldErrors = Partial<
  Record<
    "name" | "sku" | "category" | "description" | "quantity" | "unitPrice" | "reorderLevel",
    string
  >
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
