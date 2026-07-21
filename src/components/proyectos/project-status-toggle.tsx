"use client";

import { useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import type { ProjectStatus } from "@/lib/types";
import { setProjectStatus } from "@/app/proyectos/actions";

type Props = {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  onResult: (message: string, variant: "success" | "error") => void;
  /** `icon` for the compact button on a project card; `button` for the detail header. */
  variant?: "icon" | "button";
  className?: string;
};

/**
 * Marks a project finished, or reopens it. Reversible either way, so there's no
 * confirmation step — the toast plus the visible move between sections is
 * enough feedback.
 */
export function ProjectStatusToggle({
  projectId,
  projectName,
  status,
  onResult,
  variant = "icon",
  className = "",
}: Props) {
  const [pending, startTransition] = useTransition();
  const completed = status === "COMPLETED";

  const label = completed
    ? `Reabrir el proyecto ${projectName}`
    : `Marcar el proyecto ${projectName} como finalizado`;
  const Icon = completed ? RotateCcw : CheckCircle2;

  function toggle() {
    if (pending) return;
    startTransition(async () => {
      const result = await setProjectStatus(projectId, completed ? "ACTIVE" : "COMPLETED");
      onResult(result.ok ? result.message : result.error, result.ok ? "success" : "error");
    });
  }

  if (variant === "button") {
    return (
      // Secondary on purpose: "Asignar" is this page's primary action, and the
      // accent is already spent on it and on "Añadir Nuevo Proyecto".
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={label}
        className={`btn btn-secondary ${className}`}
      >
        <Icon size={16} />
        <span className="hidden sm:inline">
          {pending ? "Guardando…" : completed ? "Reabrir" : "Marcar finalizado"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={label}
      title={completed ? "Reabrir proyecto" : "Marcar como finalizado"}
      aria-busy={pending}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-55 ${
        completed
          ? "text-ink-faint hover:bg-surface-2 hover:text-ink"
          : "text-ink-faint hover:bg-ok-weak hover:text-ok-ink"
      } ${className}`}
    >
      <Icon size={16} />
    </button>
  );
}
