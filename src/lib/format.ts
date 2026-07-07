export type StockStatus = "out" | "low" | "healthy";

/** A product is "low" when its quantity is at or below its reorder level.
 * Zero is treated as the more urgent "out" — still part of the low set. */
export function stockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity <= 0) return "out";
  if (quantity <= reorderLevel) return "low";
  return "healthy";
}

export function isLowStock(quantity: number, reorderLevel: number): boolean {
  return quantity <= reorderLevel;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

const integer = new Intl.NumberFormat("en-US");

export function formatInt(value: number): string {
  return integer.format(value);
}

/** Fraction (0–1) of the gauge to fill. The full bar represents twice the
 * reorder level, so sitting exactly at the reorder line reads as half-full. */
export function gaugeFill(quantity: number, reorderLevel: number): number {
  const full = reorderLevel > 0 ? reorderLevel * 2 : Math.max(quantity, 1);
  return Math.max(0, Math.min(1, quantity / full));
}

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDateTime(value: Date | string): string {
  return dateTime.format(typeof value === "string" ? new Date(value) : value);
}
