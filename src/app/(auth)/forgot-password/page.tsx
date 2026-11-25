import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold">Forgot your password?</h1>
      <p className="mb-8 text-muted-foreground">
        Enter your email and we&apos;ll send you a link to reset it.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
