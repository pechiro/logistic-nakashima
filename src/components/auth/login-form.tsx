"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { login, type LoginResult } from "@/app/login/actions";

const initialState: LoginResult = { error: "" };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="username" className="field-label">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          required
          className="input"
          placeholder="admin"
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          placeholder="••••••••"
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md bg-out-weak px-3 py-2 text-sm text-out">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        <LogIn size={17} />
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
