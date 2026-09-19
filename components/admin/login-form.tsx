"use client";

import { useActionState } from "react";
import { login, type AuthFormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthFormState = {};

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium text-[var(--color-ink)]">
        Email
        <Input
          className="mt-1"
          type="email"
          name="email"
          autoComplete="email"
          required
          disabled={!configured || pending}
        />
      </label>
      <label className="block text-sm font-medium text-[var(--color-ink)]">
        Password
        <Input
          className="mt-1"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={8}
          disabled={!configured || pending}
        />
      </label>
      {state.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={!configured || pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
