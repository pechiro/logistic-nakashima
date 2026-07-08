"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Overlay } from "@/components/ui/overlay";
import { createProject, type ProjectActionResult } from "@/app/proyectos/actions";

const INITIAL: ProjectActionResult = { ok: false, error: "" };

export function NewProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(createProject, INITIAL);
  // Controlled input: React 19 resets uncontrolled fields after a form action,
  // which would wipe the name on a validation error (e.g. duplicate).
  const [name, setName] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      onCreated(state.message);
    }
  }, [state, onCreated]);

  const error = !state.ok ? state.error : "";

  return (
    <Overlay
      open={open}
      onClose={onClose}
      variant="center"
      labelledBy="new-project-title"
      describedBy="new-project-desc"
    >
      <form action={formAction} className="p-6">
        <h2
          id="new-project-title"
          className="font-display text-lg font-semibold tracking-tight text-ink"
        >
          Nuevo proyecto
        </h2>
        <p id="new-project-desc" className="mt-1 text-sm text-ink-muted">
          Dale un nombre al proyecto para empezar a asignarle materiales del almacén.
        </p>

        <div className="mt-5">
          <label htmlFor="project-name" className="field-label">
            Nombre del proyecto
          </label>
          <input
            id="project-name"
            name="name"
            type="text"
            data-autofocus
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. PAITA"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "project-name-error" : undefined}
            className="input"
          />
          {error && (
            <p id="project-name-error" role="alert" className="mt-1 text-xs text-out">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Creando…" : "Crear proyecto"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}
