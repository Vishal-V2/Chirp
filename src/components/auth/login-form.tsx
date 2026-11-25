"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "@/app/actions/auth";
import { FormError, FormField, SubmitButton } from "./form-field";

export function LoginForm({ next, linkError }: { next?: string; linkError?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {
    error: linkError,
  });

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next ?? "/"} />
      <FormError message={state.error} />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        error={state.fieldErrors?.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <Link
        href="/forgot-password"
        className="-mt-2 self-end text-sm font-medium text-primary hover:underline"
      >
        Forgot password?
      </Link>
      <SubmitButton pending={pending}>Log in</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
