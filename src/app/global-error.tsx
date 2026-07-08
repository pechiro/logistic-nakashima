"use client";

// Root error boundary: catches errors thrown by the root layout itself (e.g. the
// app shell), which a segment error.tsx can't. Must render its own <html>/<body>.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbfbfc",
          color: "#111725",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 24 + "rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            Algo salió mal
          </h2>
          <p style={{ marginTop: "0.5rem", color: "#5a6472" }}>
            Ocurrió un error en el servidor. Vuelve a intentarlo en un momento.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              padding: "0.5rem 1rem",
              borderRadius: 8,
              background: "#3a4fd6",
              color: "#fff",
              border: 0,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
