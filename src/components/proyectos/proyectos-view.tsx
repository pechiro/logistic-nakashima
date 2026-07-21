"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import type { ProjectListItem } from "@/lib/types";
import { formatInt } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Toast } from "@/components/toast";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectStatusToggle } from "./project-status-toggle";

type ToastState = { id: number; message: string; variant: "success" | "error" };

type Notify = (message: string, variant: "success" | "error") => void;

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

function ProjectCard({ project, onResult }: { project: ProjectListItem; onResult: Notify }) {
  const completed = project.status === "COMPLETED";

  return (
    // `relative` anchors the stretched link below. The card can't *be* the link:
    // the status toggle is a button, and a button inside an anchor is invalid.
    <li
      className={`card group relative flex min-w-0 flex-col gap-3 p-5 transition-colors hover:border-line-strong hover:bg-surface-2 ${
        completed ? "opacity-65 hover:opacity-100 focus-within:opacity-100" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
            completed ? "bg-surface-2 text-ink-faint" : "bg-accent-weak text-accent"
          }`}
        >
          <FolderKanban size={20} />
        </span>
        <h2 className="min-w-0 flex-1 truncate font-display text-lg font-semibold tracking-tight text-ink">
          {project.name}
        </h2>
        {/* Above the stretched link so it stays clickable. */}
        <ProjectStatusToggle
          projectId={project.id}
          projectName={project.name}
          status={project.status}
          onResult={onResult}
          className="relative z-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
        <span>
          <strong className="font-medium text-ink tabular-nums">
            {formatInt(project.itemCount)}
          </strong>{" "}
          {project.itemCount === 1 ? "material" : "materiales"}
        </span>
        <span aria-hidden className="text-line-strong">
          ·
        </span>
        <span>
          <strong className="font-medium text-ink tabular-nums">
            {formatInt(project.totalDispatched)}
          </strong>{" "}
          despachadas
        </span>
        {completed && (
          <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Finalizado
          </span>
        )}
      </div>

      {/* Stretched link: covers the whole card, so the card reads as one target.
          aria-label rather than an .sr-only span — .sr-only is position:absolute
          and only stays contained inside a positioned ancestor. */}
      <Link
        href={`/proyectos/${project.id}`}
        aria-label={`Abrir el proyecto ${project.name}`}
        className="absolute inset-0 rounded-lg"
      />
    </li>
  );
}

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
  const notify = useCallback<Notify>(
    (message, variant) => setToast({ id: Date.now(), message, variant }),
    [],
  );
  const onCreated = useCallback(
    (message: string) => {
      setDialogOpen(false);
      setToast({ id: Date.now(), message, variant: "success" });
    },
    [],
  );

  // The server already ordered each group; just partition, keeping that order.
  const { active, completed } = useMemo(() => {
    const active: ProjectListItem[] = [];
    const completed: ProjectListItem[] = [];
    for (const p of projects) (p.status === "COMPLETED" ? completed : active).push(p);
    return { active, completed };
  }, [projects]);

  return (
    <>
      <PageHeader eyebrow="Almacén" title="Proyectos">
        <button type="button" onClick={openCreate} className="btn btn-primary shrink-0">
          <Plus size={16} strokeWidth={2.4} />
          <span className="hidden sm:inline">Añadir Nuevo Proyecto</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </PageHeader>

      <div className="px-5 py-6 lg:px-8">
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
          <>
            <p className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-muted">
              <span>
                <strong className="font-display text-ink tabular-nums">
                  {formatInt(active.length)}
                </strong>{" "}
                {active.length === 1 ? "proyecto activo" : "proyectos activos"}
              </span>
              {completed.length > 0 && (
                <>
                  <span aria-hidden className="text-line-strong">
                    ·
                  </span>
                  <span>
                    <strong className="font-display text-ink tabular-nums">
                      {formatInt(completed.length)}
                    </strong>{" "}
                    {completed.length === 1 ? "finalizado" : "finalizados"}
                  </span>
                </>
              )}
            </p>

            {active.length > 0 ? (
              <ul className={GRID}>
                {active.map((p) => (
                  <ProjectCard key={p.id} project={p} onResult={notify} />
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-line-strong px-5 py-8 text-center text-sm text-ink-muted">
                No hay proyectos activos. Reabre uno de abajo o crea uno nuevo.
              </p>
            )}

            {completed.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  Finalizados
                  <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-ink-faint">
                    {formatInt(completed.length)}
                  </span>
                </h2>
                <ul className={GRID}>
                  {completed.map((p) => (
                    <ProjectCard key={p.id} project={p} onResult={notify} />
                  ))}
                </ul>
              </section>
            )}
          </>
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
