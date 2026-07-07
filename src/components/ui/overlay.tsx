"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const EXIT_MS = 200;

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  variant?: "drawer" | "center";
  labelledBy?: string;
  describedBy?: string;
  children: React.ReactNode;
};

/**
 * Accessible modal surface shared by the product drawer and the delete dialog.
 * Handles enter/exit animation, scroll lock, Escape, backdrop click, a focus
 * trap, and focus restore. Focuses [data-autofocus] first, else the first
 * focusable element. Respects prefers-reduced-motion via motion-reduce.
 */
export function Overlay({
  open,
  onClose,
  variant = "center",
  labelledBy,
  describedBy,
  children,
}: OverlayProps) {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  // Keep onClose current without re-running the trap effect (which would steal
  // focus back to the first field on every parent render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      setRender(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const timer = setTimeout(() => setRender(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!render) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    restoreRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        panel.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 30);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (active && !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.();
    };
  }, [render]);

  if (!render || typeof document === "undefined") return null;

  const wrapperClass =
    variant === "drawer"
      ? "absolute inset-y-0 right-0 flex max-w-full"
      : "absolute inset-0 flex items-center justify-center p-4";

  const panelClass =
    variant === "drawer"
      ? `flex h-full w-[27rem] max-w-full flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none ${
          shown ? "translate-x-0" : "translate-x-full"
        }`
      : `w-full max-w-md overflow-hidden rounded-lg border border-line bg-surface shadow-2xl transition-all duration-200 ease-out motion-reduce:transition-none ${
          shown
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-[0.98] opacity-0"
        }`;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        onClick={onClose}
        className={`absolute inset-0 bg-ink/25 transition-opacity duration-200 motion-reduce:transition-none ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className={wrapperClass}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          className={panelClass}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
