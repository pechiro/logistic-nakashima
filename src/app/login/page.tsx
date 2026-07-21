import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; expired?: string }>;
}) {
  const { next, expired } = await searchParams;
  const dest = typeof next === "string" && next.startsWith("/") ? next : "/";

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-nakashima.png"
            alt="NKS Ops"
            width={120}
            height={120}
            className="h-auto w-[120px] max-w-[150px] rounded-lg object-contain"
          />
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
            Iniciar sesión en NKS Ops
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Ingresa tus credenciales para acceder al inventario.
          </p>
        </div>

        {expired ? (
          <p
            role="status"
            className="mb-4 rounded-md border border-low-bar/30 bg-low-weak px-3 py-2 text-sm text-low"
          >
            Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.
          </p>
        ) : null}

        <div className="card p-6">
          <LoginForm next={dest} />
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">NKS Ops</p>
      </div>
    </main>
  );
}
