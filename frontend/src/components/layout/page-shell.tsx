import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageShell({
  title,
  description,
  children,
  actions,
  className,
}: PageShellProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6", className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
