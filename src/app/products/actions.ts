"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  fieldErrorsFromZod,
  productInputSchema,
  type FieldErrors,
} from "@/lib/validation";

export type SaveResult =
  | { ok: true; message: string }
  | { ok: false; fieldErrors?: FieldErrors; formError?: string };

/** Create (no id) or update (with id) a product from a submitted form. */
export async function saveProduct(
  _prevState: SaveResult,
  formData: FormData,
): Promise<SaveResult> {
  const id = (formData.get("id") as string | null)?.trim() || null;

  const parsed = productInputSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    category: formData.get("category"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    reorderLevel: formData.get("reorderLevel"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  // Block duplicate names (case-insensitive) so the same product can't be added
  // twice. On edit, exclude the product itself so re-saving is allowed.
  const duplicate = await prisma.product.findFirst({
    where: {
      name: { equals: parsed.data.name, mode: "insensitive" },
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    return {
      ok: false,
      fieldErrors: {
        name: "No se puede añadir ya que el producto ya se encuentra en el inventario.",
      },
    };
  }

  try {
    if (id) {
      await prisma.product.update({ where: { id }, data: parsed.data });
    } else {
      await prisma.product.create({ data: parsed.data });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { ok: false, fieldErrors: { sku: "Ese SKU ya está en uso." } };
      }
      if (error.code === "P2025") {
        return {
          ok: false,
          formError: "Ese producto ya no existe. Actualiza e inténtalo de nuevo.",
        };
      }
    }
    throw error;
  }

  revalidatePath("/products");
  return { ok: true, message: id ? "Cambios guardados." : "Producto añadido." };
}

export type DeleteResult = { ok: boolean; message: string };

export async function deleteProduct(id: string): Promise<DeleteResult> {
  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, message: "Ese producto ya fue eliminado." };
    }
    throw error;
  }

  revalidatePath("/products");
  return { ok: true, message: "Producto eliminado." };
}
