import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Stat / KPI card placeholder (Dashboard, Projects, Leads) */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm",
        className
      )}
    >
      <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function StatCardsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Single table row placeholder */
export function TableRowSkeleton({
  columns = 6,
  withAvatar = true,
}: {
  columns?: number;
  withAvatar?: boolean;
}) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-4">
          {index === 0 && withAvatar ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ) : (
            <Skeleton className="h-4 w-full max-w-[100px]" />
          )}
        </td>
      ))}
    </tr>
  );
}

/** Full table shell with header + skeleton rows */
export function TableSkeleton({
  columns = 7,
  rows = 5,
  headers,
  withAvatar = true,
  className,
}: {
  columns?: number;
  rows?: number;
  headers?: string[];
  withAvatar?: boolean;
  className?: string;
}) {
  const columnCount = headers?.length ?? columns;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full table-fixed caption-bottom text-left text-sm">
        <thead className="border-b border-border bg-muted/30 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <tr>
            {headers
              ? headers.map((header) => (
                  <th key={header} className="px-4 py-4 text-left">
                    {header}
                  </th>
                ))
              : Array.from({ length: columnCount }).map((_, index) => (
                  <th key={index} className="px-4 py-4 text-left">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRowSkeleton
              key={index}
              columns={columnCount}
              withAvatar={withAvatar}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
