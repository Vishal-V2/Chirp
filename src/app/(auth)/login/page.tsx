import type { Metadata } from "next";
import { GoogleSignIn } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, error, notice } = await props.searchParams;
  return (
    <>
      <h1 className="mb-8 font-heading text-3xl font-extrabold tracking-tight">
        Log in to Chirp
      </h1>
      {typeof notice === "string" && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-[15px]"
        >
          {notice}
        </p>
      )}
      <GoogleSignIn next={typeof next === "string" ? next : undefined} />
      <LoginForm
        next={typeof next === "string" ? next : undefined}
        linkError={typeof error === "string" ? error : undefined}
      />
    </>
  );
}
