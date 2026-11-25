import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, error } = await props.searchParams;
  return (
    <>
      <h1 className="mb-8 font-heading text-3xl font-extrabold tracking-tight">Log in to Chirp</h1>
      <LoginForm
        next={typeof next === "string" ? next : undefined}
        linkError={typeof error === "string" ? error : undefined}
      />
    </>
  );
}
