"use client";

// Segment error boundary: catches render/data errors in a page (below the root
// layout) so the app shows a friendly message and a retry instead of crashing.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
        Algo salió mal
      </h2>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        No se pudieron cargar los datos. Vuelve a intentarlo en un momento.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-5">
        Reintentar
      </button>
    </div>
  );
}
