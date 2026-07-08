"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type ProjectActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const MAX_NAME = 80;
const MAX_AMOUNT = 1_000_000;

// Etiqueta con la que se registra en Movimientos un despacho a proyecto.
// (Los módulos "use server" solo pueden exportar funciones async, así que
// esta constante se mantiene local al archivo.)
const DISPATCH_NOTE = "DESPACHO A PROYECTO";

/** Crear un proyecto nuevo. Los nombres son únicos. */
export async function createProject(
  _prevState: ProjectActionResult,
  formData: FormData,
): Promise<ProjectActionResult> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) return { ok: false, error: "Escribe el nombre del proyecto." };
  if (name.length > MAX_NAME) {
    return { ok: false, error: `Usa menos de ${MAX_NAME} caracteres.` };
  }

  try {
    await prisma.project.create({ data: { name } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Ya existe un proyecto con ese nombre." };
    }
    throw error;
  }

  revalidatePath("/proyectos");
  return { ok: true, message: "Proyecto creado." };
}

/**
 * Asignar (despachar) una cantidad de un producto a un proyecto. Corre una sola
 * transacción que: valida que haya stock suficiente (decremento atómico con la
 * guarda `quantity >= amount`, para que el inventario nunca quede negativo),
 * descuenta el stock del almacén, registra el ProjectItem y deja un movimiento
 * "OUT" etiquetado como "DESPACHO A PROYECTO". Revalida cada página cuyos
 * números cambian.
 */
export async function assignMaterial(
  projectId: string,
  productId: string,
  amountInput: number,
): Promise<ProjectActionResult> {
  // La entrada es no confiable — validar todo aquí.
  if (typeof projectId !== "string" || projectId.length === 0) {
    return { ok: false, error: "Falta el proyecto." };
  }
  if (typeof productId !== "string" || productId.length === 0) {
    return { ok: false, error: "Selecciona un material." };
  }
  const amount = Math.trunc(Number(amountInput));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresa una cantidad mayor que cero." };
  }
  if (amount > MAX_AMOUNT) {
    return {
      ok: false,
      error: `Mantén la cantidad por debajo de ${MAX_AMOUNT.toLocaleString("es-PE")}.`,
    };
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      // El proyecto debe existir (mejor mensaje que un fallo de clave foránea).
      const project = await tx.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (!project) {
        return { ok: false as const, error: "Ese proyecto ya no existe." };
      }

      // Decremento atómico con guarda: solo baja el stock cuando alcanza, así
      // dos despachos simultáneos no pueden dejar la cantidad por debajo de 0.
      const updated = await tx.product.updateMany({
        where: { id: productId, quantity: { gte: amount } },
        data: { quantity: { decrement: amount } },
      });

      if (updated.count === 0) {
        const existing = await tx.product.findUnique({
          where: { id: productId },
          select: { quantity: true },
        });
        if (!existing) {
          return { ok: false as const, error: "Ese material ya no existe." };
        }
        return {
          ok: false as const,
          error: `Solo hay ${existing.quantity} en stock — no se pueden despachar ${amount}.`,
        };
      }

      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { name: true, quantity: true },
      });

      await tx.projectItem.create({
        data: { projectId, productId, quantityRequested: amount },
      });

      // Registrar el despacho en el historial de Movimientos.
      await tx.stockMovement.create({
        data: {
          productId,
          type: "OUT",
          amount,
          resultingQuantity: product.quantity,
          note: DISPATCH_NOTE,
        },
      });

      return {
        ok: true as const,
        message: `Se despacharon ${amount} de ${product.name} al proyecto — quedan ${product.quantity} en stock.`,
      };
    });

    if (outcome.ok) {
      revalidatePath(`/proyectos/${projectId}`);
      revalidatePath("/proyectos");
      revalidatePath("/stock");
      revalidatePath("/products");
      revalidatePath("/movements");
      revalidatePath("/");
    }
    return outcome;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2034") {
        // Conflicto de escritura por despachos concurrentes — se puede reintentar.
        return { ok: false, error: "El material se acaba de actualizar — inténtalo de nuevo." };
      }
      if (error.code === "P2025" || error.code === "P2003") {
        return { ok: false, error: "Ese material o proyecto ya no existe." };
      }
      if (error.code === "P2023") {
        return { ok: false, error: "Esa cantidad es demasiado grande." };
      }
    }
    throw error;
  }
}
