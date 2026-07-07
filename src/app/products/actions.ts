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
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    reorderLevel: formData.get("reorderLevel"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
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
        return { ok: false, fieldErrors: { sku: "That SKU is already in use." } };
      }
      if (error.code === "P2025") {
        return {
          ok: false,
          formError: "That product no longer exists. Refresh and try again.",
        };
      }
    }
    throw error;
  }

  revalidatePath("/products");
  return { ok: true, message: id ? "Changes saved." : "Product added." };
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
      return { ok: false, message: "That product was already removed." };
    }
    throw error;
  }

  revalidatePath("/products");
  return { ok: true, message: "Product deleted." };
}
