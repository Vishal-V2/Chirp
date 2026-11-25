"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { signUp, type AuthState } from "@/app/actions/auth";
import { FormError, FormField, SubmitButton } from "./form-field";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});

  if (state.checkEmail) {
    return (
      <div className="flex flex-col gap-4">
        <MailCheck className="size-10 text-primary" />
        <h2 className="text-2xl font-extrabold">Check your email</h2>
        <p className="text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{state.checkEmail}</span>. Click it to
          finish creating your account.
        </p>
        <p className="text-sm text-muted-foreground">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            go to log in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
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
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      />
      <SubmitButton pending={pending}>Create account</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
