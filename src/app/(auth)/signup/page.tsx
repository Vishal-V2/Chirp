import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-2 font-heading text-4xl font-extrabold tracking-tight">
        Say it in a chirp.
      </h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Create an account to post and follow people.
      </p>
      <SignupForm />
    </>
  );
}
