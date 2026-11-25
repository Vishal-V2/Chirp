"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() =>
        window.history.length > 1 ? router.back() : router.push("/")
      }
      className="-ml-2 rounded-full p-2 transition-colors hover:bg-muted"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
