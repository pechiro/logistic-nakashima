"use client";

import { useEffect } from "react";
import { Check, TriangleAlert, X } from "lucide-react";

/** A single transient confirmation. Auto-dismisses after a few seconds. */
export function Toast({
  message,
  onDismiss,
  variant = "success",
}: {
  message: string;
  onDismiss: () => void;
  variant?: "success" | "error";
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isError = variant === "error";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-6 sm:justify-end sm:pr-6">
      <div
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
        className="toast-enter pointer-events-auto flex items-center gap-3 rounded-lg border border-line bg-surface py-3 pl-4 pr-2 shadow-lg"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            isError ? "bg-out-weak text-out" : "bg-ok-weak text-ok-ink"
          }`}
        >
          {isError ? (
            <TriangleAlert size={14} />
          ) : (
            <Check size={14} strokeWidth={3} />
          )}
        </span>
        <span className="text-sm font-medium text-ink">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="icon-btn h-7 w-7"
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
