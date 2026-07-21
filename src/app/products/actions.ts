"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  fieldErrorsFromZod,
  productInputSchema,
  type FieldErrors,
} from "@/lib/validation";
import {
  MAX_IMAGE_BYTES,
  removeProductImage,
  uploadProductImage,
} from "@/lib/supabase-storage";

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
    specialty: formData.get("specialty"),
    measure: formData.get("measure"),
    imageUrl: formData.get("imageUrl"),
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

// -- Product photos (Supabase Storage) ---------------------------------------

export type ImageActionResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Pull the uploaded image off a FormData and validate it. */
function readImage(
  formData: FormData,
): { ok: true; file: File } | { ok: false; error: string } {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecciona o toma una foto primero." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "El archivo debe ser una imagen." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "La imagen supera el límite de 8 MB." };
  }
  return { ok: true, file };
}

/**
 * Upload a product photo and return its public URL WITHOUT touching the
 * database. The product form stashes the URL in a hidden field and persists it
 * on save — so this works for a brand-new product that has no id yet.
 */
export async function uploadProductImageAction(
  formData: FormData,
): Promise<ImageActionResult> {
  const parsed = readImage(formData);
  if (!parsed.ok) return parsed;
  try {
    const url = await uploadProductImage(parsed.file);
    return { ok: true, url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo subir la imagen.",
    };
  }
}

/**
 * Upload a photo AND attach it to an existing product in one step — the quick
 * "camera" action on each Productos row, which skips the full edit form. The
 * product's previous image is removed (best-effort) once the new one is saved.
 */
export async function updateProductImage(
  productId: string,
  formData: FormData,
): Promise<ImageActionResult> {
  if (typeof productId !== "string" || productId.length === 0) {
    return { ok: false, error: "Falta el producto." };
  }
  const parsed = readImage(formData);
  if (!parsed.ok) return parsed;

  try {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { imageUrl: true },
    });
    if (!existing) return { ok: false, error: "Ese producto ya no existe." };

    const url = await uploadProductImage(parsed.file);
    await prisma.product.update({ where: { id: productId }, data: { imageUrl: url } });

    // The old file is now unreferenced; drop it. Never blocks success.
    if (existing.imageUrl && existing.imageUrl !== url) {
      await removeProductImage(existing.imageUrl);
    }

    revalidatePath("/products");
    return { ok: true, url };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, error: "Ese producto ya no existe." };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo actualizar la imagen.",
    };
  }
}
