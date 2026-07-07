"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { MovementType } from "@/lib/types";

export type StockResult = { ok: true; message: string } | { ok: false; error: string };

// Matches the Product field validation cap. Amounts also must fit a 32-bit Int.
const MAX_AMOUNT = 1_000_000;

/**
 * Apply a stock change: update the product's quantity and log a StockMovement in
 * one transaction. The OUT path uses an atomic guarded update (decrement only
 * when enough is on hand) so concurrent adjustments can't oversell. Revalidates
 * every page that shows a quantity so the LOW STOCK badge updates automatically.
 */
export async function adjustStock(
  productId: string,
  type: MovementType,
  amountInput: number,
): Promise<StockResult> {
  // The client is untrusted — validate everything here.
  if (type !== "IN" && type !== "OUT") {
    return { ok: false, error: "Invalid stock movement." };
  }
  if (typeof productId !== "string" || productId.length === 0) {
    return { ok: false, error: "Missing product." };
  }
  const amount = Math.trunc(Number(amountInput));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  if (amount > MAX_AMOUNT) {
    return { ok: false, error: `Keep the amount under ${MAX_AMOUNT.toLocaleString()}.` };
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      // Atomic guarded update: for OUT, only decrement when stock is sufficient,
      // so two simultaneous removals can't drive quantity below zero.
      const updated = await tx.product.updateMany({
        where:
          type === "OUT"
            ? { id: productId, quantity: { gte: amount } }
            : { id: productId },
        data: {
          quantity: type === "IN" ? { increment: amount } : { decrement: amount },
        },
      });

      if (updated.count === 0) {
        // No row matched: the product is gone, or (OUT) there isn't enough stock.
        const existing = await tx.product.findUnique({
          where: { id: productId },
          select: { quantity: true },
        });
        if (!existing) {
          return { ok: false as const, error: "That product no longer exists." };
        }
        return {
          ok: false as const,
          error: `Only ${existing.quantity} in stock — can't remove ${amount}.`,
        };
      }

      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { quantity: true, name: true },
      });
      await tx.stockMovement.create({
        data: { productId, type, amount, resultingQuantity: product.quantity },
      });

      return {
        ok: true as const,
        message:
          type === "IN"
            ? `Added ${amount} to ${product.name} — ${product.quantity} in stock.`
            : `Removed ${amount} from ${product.name} — ${product.quantity} in stock.`,
      };
    });

    if (outcome.ok) {
      revalidatePath("/stock");
      revalidatePath("/movements");
      revalidatePath("/products");
    }
    return outcome;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { ok: false, error: "That product no longer exists." };
      }
      if (error.code === "P2034") {
        // Write conflict under concurrent adjustments — safe to retry.
        return { ok: false, error: "That product was just updated — try again." };
      }
      if (error.code === "P2023") {
        return { ok: false, error: "That amount is too large." };
      }
    }
    throw error;
  }
}
