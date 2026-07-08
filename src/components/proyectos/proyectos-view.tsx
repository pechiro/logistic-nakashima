"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import type { ProjectListItem } from "@/lib/types";
import { formatInt } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Toast } from "@/components/toast";
import { NewProjectDialog } from "./new-project-dialog";

type ToastState = { id: number; message: string; variant: "success" | "error" };

export function ProyectosView({ projects }: { projects: ProjectListItem[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formNonce, setFormNonce] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);

  const openCreate = useCallback(() => {
    setFormNonce((n) => n + 1);
    setDialogOpen(true);
  }, []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);
  const dismiss = useCallback(() => setToast(null), []);
  const onCreated = useCallback((message: string) => {
    setDialogOpen(false);
    setToast({ id: Date.now(), message, variant: "success" });
  }, []);

  return (
    <>
      <PageHeader eyebrow="Almacén" title="Proyectos">
        <button type="button" onClick={openCreate} className="btn btn-primary">
          <Plus size={16} strokeWidth={2.4} />
          <span className="hidden sm:inline">Añadir Nuevo Proyecto</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </PageHeader>

      <div className="px-5 py-6 lg:px-8">
        <p className="mb-4 text-sm text-ink-muted">
          <strong className="font-display text-ink tabular-nums">
            {projects.length}
          </strong>{" "}
          {projects.length === 1 ? "proyecto activo" : "proyectos activos"}
        </p>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={22} />}
            title="Aún no hay proyectos"
            body="Crea tu primer proyecto para empezar a asignarle materiales del almacén."
            action={
              <button type="button" onClick={openCreate} className="btn btn-primary">
                <Plus size={16} strokeWidth={2.4} />
                Añadir Nuevo Proyecto
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                className="card group flex flex-col gap-3 p-5 transition-colors hover:border-line-strong hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-weak text-accent">
                    <FolderKanban size={20} />
                  </span>
                  <h2 className="min-w-0 truncate font-display text-lg font-semibold tracking-tight text-ink">
                    {p.name}
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-sm text-ink-muted">
                  <span>
                    <strong className="font-medium text-ink tabular-nums">
                      {formatInt(p.itemCount)}
                    </strong>{" "}
                    {p.itemCount === 1 ? "material" : "materiales"}
                  </span>
                  <span aria-hidden className="text-line-strong">
                    ·
                  </span>
                  <span>
                    <strong className="font-medium text-ink tabular-nums">
                      {formatInt(p.totalDispatched)}
                    </strong>{" "}
                    despachadas
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <NewProjectDialog
        key={formNonce}
        open={dialogOpen}
        onClose={closeDialog}
        onCreated={onCreated}
      />
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={dismiss}
        />
      )}
    </>
  );
}
