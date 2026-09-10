import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const glassPulse =
  "animate-pulse border border-white/40 bg-white/40 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10";

const glassSoft =
  "animate-pulse rounded-md border border-white/30 bg-slate-200/60 dark:border-white/10 dark:bg-white/10";

type SkeletonBoxProps = ComponentProps<"div">;

/** Thin rectangular block for text lines. */
export function SkeletonText({ className, ...props }: SkeletonBoxProps) {
  return (
    <div
      data-slot="skeleton-text"
      className={cn(glassSoft, "h-3 w-24", className)}
      {...props}
    />
  );
}

/** Circular pulsing avatar placeholder. */
export function SkeletonAvatar({ className, ...props }: SkeletonBoxProps) {
  return (
    <div
      data-slot="skeleton-avatar"
      className={cn(glassPulse, "size-10 shrink-0 rounded-full", className)}
      {...props}
    />
  );
}

/** Form input field placeholder. */
export function SkeletonInput({ className, ...props }: SkeletonBoxProps) {
  return (
    <div
      data-slot="skeleton-input"
      className={cn(glassPulse, "h-9 w-full rounded-lg", className)}
      {...props}
    />
  );
}

/** Rounded glass box for KPI cards and panels. */
export function SkeletonCard({ className, ...props }: SkeletonBoxProps) {
  return (
    <div
      data-slot="skeleton-card"
      className={cn(glassPulse, "rounded-xl p-4", className)}
      {...props}
    />
  );
}

/** Horizontal flex container representing a table row. */
export function SkeletonRow({ className, ...props }: SkeletonBoxProps) {
  return (
    <div
      data-slot="skeleton-row"
      className={cn("flex items-center gap-3", className)}
      {...props}
    />
  );
}

/** Users table body row mimicking checkbox / avatar / role / status / date. */
export function SkeletonTableRow() {
  return (
    <tr className="border-b border-border/60">
      <td className="px-4 py-3">
        <div className={cn(glassSoft, "mx-auto size-4 rounded")} />
      </td>
      <td className="px-4 py-3">
        <SkeletonRow>
          <SkeletonAvatar className="size-8" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonText className="h-3.5 w-28" />
            <SkeletonText className="h-2.5 w-36 opacity-70" />
          </div>
        </SkeletonRow>
      </td>
      <td className="px-4 py-3">
        <SkeletonText className="h-3.5 w-24" />
      </td>
      <td className="px-4 py-3">
        <div className={cn(glassSoft, "h-6 w-16 rounded-full")} />
      </td>
      <td className="px-4 py-3">
        <SkeletonText className="h-3.5 w-20" />
      </td>
      <td className="px-4 py-3">
        <div className={cn(glassSoft, "mx-auto size-6 rounded-md")} />
      </td>
    </tr>
  );
}

/** CRM Dashboard skeleton — Staff omits revenue / admin-only panels. */
export function DashboardSkeleton({
  className,
  isAdmin = true,
}: {
  className?: string;
  isAdmin?: boolean;
}) {
  const kpiCount = isAdmin ? 10 : 9;

  return (
    <div className={cn("space-y-5", className)} aria-busy="true" aria-live="polite">
      <div
        className={cn(
          "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6",
          isAdmin ? "lg:grid-cols-4" : "xl:grid-cols-3"
        )}
      >
        {Array.from({ length: kpiCount }).map((_, index) => (
          <SkeletonCard key={index} className="h-24">
            <div className="flex items-start gap-3">
              <div className={cn(glassSoft, "size-10 shrink-0 rounded-xl")} />
              <div className="flex-1 space-y-2 pt-1">
                <SkeletonText className="h-3 w-20" />
                <SkeletonText className="h-6 w-14" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
      <div
        className={cn(
          "grid grid-cols-1 items-stretch gap-4",
          isAdmin ? "lg:grid-cols-3" : "md:grid-cols-2"
        )}
      >
        {Array.from({ length: isAdmin ? 3 : 2 }).map((_, index) => (
          <SkeletonCard key={index} className="h-80 space-y-4">
            <SkeletonText className="h-4 w-32" />
            <div className={cn(glassSoft, "h-full min-h-[220px] w-full rounded-lg")} />
          </SkeletonCard>
        ))}
      </div>
      {isAdmin ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} className="h-80 space-y-4">
              <SkeletonText className="h-4 w-32" />
              <div
                className={cn(glassSoft, "h-full min-h-[220px] w-full rounded-lg")}
              />
            </SkeletonCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** User details page layout skeleton. */
export function UserDetailsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative flex flex-1 flex-col gap-4 p-4 md:p-6", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex justify-end gap-2">
        <div className={cn(glassPulse, "h-8 w-24 rounded-lg")} />
        <div className={cn(glassPulse, "size-8 rounded-lg")} />
      </div>

      <SkeletonCard className="p-5">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex gap-4">
            <SkeletonAvatar className="h-20 w-20" />
            <div className="min-w-0 flex-1 space-y-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <SkeletonText className="h-6 w-40" />
                <div className={cn(glassSoft, "h-5 w-16 rounded-full")} />
                <div className={cn(glassSoft, "h-5 w-14 rounded-full")} />
              </div>
              <SkeletonText className="h-3 w-64 max-w-full" />
              <SkeletonText className="h-3 w-52 max-w-full opacity-70" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  glassPulse,
                  "rounded-xl px-3 py-2.5 dark:bg-white/5"
                )}
              >
                <SkeletonText className="mb-2 h-2.5 w-16" />
                <SkeletonText className="h-5 w-10" />
              </div>
            ))}
          </div>
        </div>
      </SkeletonCard>

      <div className={cn(glassPulse, "h-10 w-full rounded-xl")} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, cardIndex) => (
          <SkeletonCard key={cardIndex} className="space-y-3 p-5">
            <SkeletonText className="mb-2 h-4 w-36" />
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center justify-between gap-4 border-b border-white/20 py-2.5 last:border-0 dark:border-white/10"
              >
                <SkeletonText className="h-3 w-20" />
                <SkeletonText className="h-3.5 w-28" />
              </div>
            ))}
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

/** My Profile page layout skeleton. */
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-live="polite">
      <div className="space-y-1">
        <SkeletonText className="h-7 w-36" />
        <SkeletonText className="h-3.5 w-64 max-w-full opacity-70" />
      </div>

      <div className={cn(glassPulse, "mb-2 h-9 w-64 rounded-lg")} />

      <div className="overflow-hidden rounded-xl border border-white/40 bg-white/20 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
        <div className="flex w-full flex-col md:flex-row">
          <SkeletonCard className="flex w-full flex-col items-center gap-4 rounded-none border-0 border-r border-white/30 bg-white/30 p-6 dark:bg-white/5 md:w-1/3 lg:w-1/4">
            <SkeletonAvatar className="h-32 w-32" />
            <SkeletonText className="h-4 w-28" />
            <SkeletonText className="h-3 w-36 opacity-70" />
            <div className={cn(glassPulse, "mt-2 h-9 w-full max-w-[160px] rounded-lg")} />
          </SkeletonCard>

          <SkeletonCard className="flex-1 rounded-none border-0 bg-transparent p-6 shadow-none backdrop-blur-none dark:bg-transparent">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <SkeletonText className="h-3 w-20" />
                  <SkeletonInput />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <SkeletonText className="h-3 w-16" />
                <SkeletonInput className="h-20" />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <div className={cn(glassPulse, "h-9 w-28 rounded-lg")} />
            </div>
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}

/** Calendar month grid skeleton matching CalendarClient layout. */
export function CalendarSkeleton({ className }: { className?: string }) {
  const eventCellIndexes = new Set([2, 9, 16, 23, 30]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm",
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              glassPulse,
              "flex size-10 shrink-0 items-center justify-center rounded-lg"
            )}
          />
          <div className="space-y-2">
            <SkeletonText className="h-5 w-36" />
            <SkeletonText className="h-3 w-24 opacity-70" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border/60 p-1">
            <div className={cn(glassSoft, "size-7 rounded-md")} />
            <div className={cn(glassSoft, "h-7 w-14 rounded-md")} />
            <div className={cn(glassSoft, "size-7 rounded-md")} />
          </div>
          <div className="flex gap-1 rounded-lg border border-border/60 p-1">
            <div className={cn(glassSoft, "h-7 w-14 rounded-md")} />
            <div className={cn(glassSoft, "h-7 w-14 rounded-md")} />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="relative min-h-0 flex-1 overflow-hidden p-4">
        <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-lg border border-border bg-border/60">
          <div className="grid grid-cols-7 gap-px border-b border-border bg-border/60">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={`day-head-${index}`}
                className="flex items-center justify-center bg-card py-2"
              >
                <SkeletonText className="h-2.5 w-8" />
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-5 gap-px bg-border/60">
            {Array.from({ length: 35 }).map((_, index) => (
              <div
                key={`day-cell-${index}`}
                className="relative min-h-[88px] bg-card p-2 sm:min-h-[104px]"
              >
                <SkeletonText className="ml-auto h-3 w-4" />
                {eventCellIndexes.has(index) ? (
                  <SkeletonText className="mt-3 h-5 w-3/4 rounded-md" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Single notification row placeholder for dropdown / list infinite scroll. */
export function NotificationSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-start gap-3 rounded-xl px-3 py-2.5", className)}
      aria-busy="true"
    >
      <SkeletonAvatar className="size-9" />
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        <SkeletonText className="h-3.5 w-3/4 max-w-[200px]" />
        <SkeletonText className="h-3 w-full max-w-[240px] opacity-70" />
      </div>
    </div>
  );
}
