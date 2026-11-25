"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { requestPasswordReset, type AuthState } from "@/app/actions/auth";
import { FormError, FormField, SubmitButton } from "./form-field";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.checkEmail) {
    return (
      <div className="flex flex-col gap-4">
        <MailCheck className="size-10 text-primary" />
        <h2 className="text-2xl font-extrabold">Check your email</h2>
        <p className="text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{state.checkEmail}</span>, we sent a
          link to reset your password. Open it in this same browser.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Back to log in
        </Link>
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
      <SubmitButton pending={pending}>Send reset link</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
