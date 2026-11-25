import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-2 text-4xl font-extrabold tracking-tight">Happening now</h1>
      <p className="mb-8 text-xl font-bold">Join Chirp today.</p>
      <SignupForm />
    </>
  );
}
