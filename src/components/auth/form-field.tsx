"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Labeled input with an error message underneath. Passwords get a show/hide toggle. */
export function FormField({
  label,
  error,
  hint,
  type = "text",
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          className={cn(
            "h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary",
            isPassword && "pr-11",
            error && "border-destructive focus:border-destructive focus:ring-destructive",
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      {(error || hint) && (
        <p
          id={`${id}-msg`}
          className={cn("mt-1.5 text-sm", error ? "text-destructive" : "text-muted-foreground")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="pressable h-12 w-full rounded-full bg-foreground font-bold text-background hover:bg-foreground/85 disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
