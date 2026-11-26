import { BackButton } from "./back-button";

/** Sticky, translucent header at the top of the main column. */
export function PageHeader({
  title,
  subtitle,
  back,
  children,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="autohide-top sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
      {title && (
        <div className="flex h-[53px] items-center gap-6 px-4">
          {back && <BackButton />}
          <div className="min-w-0 leading-tight">
            <h1 className="truncate font-heading text-xl font-bold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-[13px] text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
