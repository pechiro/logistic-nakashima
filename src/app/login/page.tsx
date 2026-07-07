import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const dest = typeof next === "string" && next.startsWith("/") ? next : "/";

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-nakashima.png"
            alt="Logística Grupo Nakashima"
            width={120}
            height={120}
            className="h-auto w-[120px] max-w-[150px] rounded-lg object-contain"
          />
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
            Sign in to Logística Grupo Nakashima
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Enter your credentials to access the inventory.
          </p>
        </div>

        <div className="card p-6">
          <LoginForm next={dest} />
        </div>
      </div>
    </main>
  );
}
