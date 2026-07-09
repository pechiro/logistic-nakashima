"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type ProjectActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const MAX_NAME = 80;
const MAX_AMOUNT = 1_000_000;

// Etiquetas con las que se registran los movimientos de proyecto en el historial.
// (Los módulos "use server" solo pueden exportar funciones async, así que estas
// constantes se mantienen locales al archivo.)
const DISPATCH_NOTE = "DESPACHO A PROYECTO";
const RETURN_NOTE = "DEVOLUCIÓN DE PROYECTO";

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

      // Registrar el despacho en el historial de Movimientos, enlazado al
      // proyecto para que Movimientos muestre a qué proyecto fue.
      await tx.stockMovement.create({
        data: {
          productId,
          projectId,
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

/**
 * Devolver material de un proyecto al almacén. Corre una sola transacción que:
 * valida la asignación, descuenta la cantidad devuelta de `ProjectItem`
 * (decremento atómico con guarda para que dos devoluciones simultáneas no puedan
 * devolver de más), borra la asignación si queda en cero, vuelve a sumar el stock
 * al almacén y deja un movimiento "RETURN" ("DEVOLUCIÓN DE PROYECTO") enlazado al
 * proyecto. Revalida cada página cuyos números cambian.
 */
export async function returnMaterial(
  projectItemId: string,
  amountInput: number,
): Promise<ProjectActionResult> {
  // La entrada es no confiable — validar todo aquí.
  if (typeof projectItemId !== "string" || projectItemId.length === 0) {
    return { ok: false, error: "Falta la asignación a devolver." };
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
      const item = await tx.projectItem.findUnique({
        where: { id: projectItemId },
        select: {
          projectId: true,
          productId: true,
          quantityRequested: true,
          product: { select: { name: true } },
        },
      });
      if (!item) {
        return { ok: false as const, error: "Esa asignación ya no existe." };
      }
      if (amount > item.quantityRequested) {
        return {
          ok: false as const,
          error: `Solo puedes devolver hasta ${item.quantityRequested} — el proyecto tiene esa cantidad asignada.`,
        };
      }

      // Decremento atómico con guarda: solo baja la asignación cuando todavía
      // alcanza, así dos devoluciones simultáneas no la dejan por debajo de 0.
      const decremented = await tx.projectItem.updateMany({
        where: { id: projectItemId, quantityRequested: { gte: amount } },
        data: { quantityRequested: { decrement: amount } },
      });
      if (decremented.count === 0) {
        return {
          ok: false as const,
          error: "La asignación se acaba de actualizar — inténtalo de nuevo.",
        };
      }

      // Si ya no queda nada asignado, elimina la fila para que la lista de
      // "Materiales asignados" solo muestre lo que sigue en el proyecto.
      const remaining = await tx.projectItem.findUnique({
        where: { id: projectItemId },
        select: { quantityRequested: true },
      });
      if (remaining && remaining.quantityRequested <= 0) {
        await tx.projectItem.delete({ where: { id: projectItemId } });
      }

      // Devolver la cantidad al stock del almacén.
      const product = await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: amount } },
        select: { name: true, quantity: true },
      });

      // Registrar la devolución en el historial de Movimientos, enlazada al
      // proyecto de origen.
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          projectId: item.projectId,
          type: "RETURN",
          amount,
          resultingQuantity: product.quantity,
          note: RETURN_NOTE,
        },
      });

      return {
        ok: true as const,
        projectId: item.projectId,
        message: `Se devolvieron ${amount} de ${product.name} al almacén — ahora hay ${product.quantity} en stock.`,
      };
    });

    if (outcome.ok) {
      revalidatePath(`/proyectos/${outcome.projectId}`);
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
        // Conflicto de escritura por devoluciones concurrentes — se puede reintentar.
        return { ok: false, error: "La asignación se acaba de actualizar — inténtalo de nuevo." };
      }
      if (error.code === "P2025" || error.code === "P2003") {
        return { ok: false, error: "Ese material o asignación ya no existe." };
      }
      if (error.code === "P2023") {
        return { ok: false, error: "Esa cantidad es demasiado grande." };
      }
    }
    throw error;
  }
}

/**
 * Eliminar una asignación del registro de un proyecto SIN devolver stock al
 * almacén. Se usa cuando el material se consumió o se perdió en obra: la salida
 * ya se registró al despachar, así que aquí solo se borra la fila de ProjectItem
 * — no cambia Product.quantity ni se crea un movimiento. Revalida las páginas de
 * proyectos (el stock del almacén no cambia).
 */
export async function discardProjectItem(
  projectItemId: string,
): Promise<ProjectActionResult> {
  if (typeof projectItemId !== "string" || projectItemId.length === 0) {
    return { ok: false, error: "Falta la asignación a eliminar." };
  }

  try {
    const item = await prisma.projectItem.findUnique({
      where: { id: projectItemId },
      select: { projectId: true, product: { select: { name: true } } },
    });
    if (!item) {
      return { ok: false, error: "Esa asignación ya no existe." };
    }

    await prisma.projectItem.delete({ where: { id: projectItemId } });

    revalidatePath(`/proyectos/${item.projectId}`);
    revalidatePath("/proyectos");
    return {
      ok: true,
      message: `Se eliminó ${item.product.name} del proyecto (sin devolver stock al almacén).`,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, error: "Esa asignación ya fue eliminada." };
    }
    throw error;
  }
}
