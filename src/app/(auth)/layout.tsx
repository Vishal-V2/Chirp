import { Bird } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Brand panel (large screens only) */}
      <div className="hidden flex-1 items-center justify-center bg-primary lg:flex">
        <Bird className="size-80 text-primary-foreground" strokeWidth={1.25} />
      </div>

      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <Bird className="mb-8 size-10 text-primary lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
