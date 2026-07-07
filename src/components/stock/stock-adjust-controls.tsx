"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { adjustStock } from "@/app/stock/actions";
import type { MovementType } from "@/lib/types";

export function StockAdjustControls({
  productId,
  name,
  quantity,
  onResult,
}: {
  productId: string;
  name: string;
  quantity: number;
  onResult: (message: string, variant: "success" | "error") => void;
}) {
  const [amount, setAmount] = useState("1");
  const [pending, startTransition] = useTransition();

  function run(type: MovementType) {
    if (pending) return; // guard double-submit without disabling (keeps keyboard focus)
    const value = Math.trunc(Number(amount));
    if (!Number.isFinite(value) || value <= 0) {
      onResult("Enter an amount greater than zero.", "error");
      return;
    }
    startTransition(async () => {
      const result = await adjustStock(productId, type, value);
      onResult(
        result.ok ? result.message : result.error,
        result.ok ? "success" : "error",
      );
    });
  }

  return (
    <div className="flex items-center justify-end gap-2" aria-busy={pending}>
      <label htmlFor={`amount-${productId}`} className="sr-only">
        Amount to add or remove for {name}
      </label>
      <input
        id={`amount-${productId}`}
        type="number"
        inputMode="numeric"
        min={1}
        max={1000000}
        step={1}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="input tnum h-9 w-16 px-2 text-center"
      />
      <button
        type="button"
        onClick={() => run("IN")}
        aria-label={`Add stock to ${name}`}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-ok/30 bg-ok-weak px-2.5 text-xs font-semibold text-ok-ink transition-colors hover:bg-ok/15"
      >
        <ArrowUp size={14} strokeWidth={2.6} />
        In
      </button>
      <button
        type="button"
        onClick={() => run("OUT")}
        disabled={quantity <= 0}
        aria-label={`Remove stock from ${name}`}
        title={quantity <= 0 ? "Nothing in stock to remove" : undefined}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-2 disabled:opacity-50"
      >
        <ArrowDown size={14} strokeWidth={2.6} />
        Out
      </button>
    </div>
  );
}
