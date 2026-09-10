import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Info,
  Loader2,
  Lock,
  Pencil,
  Save,
  Shield,
  X,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  MODULE_ACTION_KEYS,
  PERMISSION_SOURCES,
  type ModuleActionKey,
  type ModulePermissionRow,
} from "@/lib/static-data/user-permissions";
import {
  createStaffPermissions,
  normalizeUserPermissions,
  PERMISSION_MODULES,
  type PermissionModule,
  type UserPermissions,
} from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import {
  getAdminUsersErrorMessage,
  fetchAdminUserById,
  fetchPermissionLogs,
  updateUserPermissions,
  type AdminUserDetail,
  type PermissionAuditLog,
} from "@/services/admin-users-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const glassCard =
  "rounded-2xl border border-white/40 bg-white/15 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-lg dark:border-white/10 dark:bg-white/5";

const glassInset =
  "rounded-xl border border-white/30 bg-white/20 backdrop-blur-md dark:border-white/10 dark:bg-white/5";

const glassToastClass =
  "border border-white/50 bg-white/25 text-foreground shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/15 dark:bg-white/10";

function rowStatus(flags: Record<ModuleActionKey, boolean>): ModulePermissionRow["status"] {
  const allAllowed = MODULE_ACTION_KEYS.every((key) => flags[key]);
  return allAllowed ? "Full Access" : "Custom";
}

function permissionsToRows(permissions: UserPermissions): ModulePermissionRow[] {
  const normalized = normalizeUserPermissions(permissions);
  return PERMISSION_MODULES.map((module) => {
    const flags = normalized[module];
    return {
      module,
      view: flags.view,
      create: flags.create,
      edit: flags.edit,
      delete: flags.delete,
      export: flags.export,
      import: flags.import,
      manage: flags.manage,
      status: rowStatus(flags),
    };
  });
}

function rowsToPermissions(rows: ModulePermissionRow[]): UserPermissions {
  const next = createStaffPermissions();
  for (const row of rows) {
    const module = row.module as PermissionModule;
    if (!PERMISSION_MODULES.includes(module)) continue;
    next[module] = {
      view: row.view,
      create: row.create,
      edit: row.edit,
      delete: row.delete,
      export: row.export,
      import: row.import,
      manage: row.manage,
    };
  }
  return next;
}

function PermissionIcon({ allowed }: { allowed: boolean }) {
  if (allowed) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 ring-1 ring-emerald-500/30">
        <Check className="size-3.5 stroke-[2.5]" />
      </span>
    );
  }

  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-red-500/15 text-red-500 ring-1 ring-red-500/25">
      <X className="size-3.5 stroke-[2.5]" />
    </span>
  );
}

function GlassPermissionToggle({
  allowed,
  onToggle,
  disabled,
}: {
  allowed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={allowed}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full border shadow-sm transition-all",
        "backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        allowed
          ? "border-emerald-400/50 bg-emerald-500/25 text-emerald-700 ring-1 ring-emerald-400/40 hover:bg-emerald-500/35 dark:text-emerald-300"
          : "border-red-400/40 bg-red-500/15 text-red-500 ring-1 ring-red-400/30 hover:bg-red-500/25 dark:text-red-300"
      )}
    >
      {allowed ? (
        <Check className="size-3.5 stroke-[2.5]" />
      ) : (
        <X className="size-3.5 stroke-[2.5]" />
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: ModulePermissionRow["status"] }) {
  if (status === "Full Access") {
    return (
      <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        Full Access
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
      Custom
    </span>
  );
}

function actionBadgeClass(action: "Updated" | "Restricted" | "Granted") {
  if (action === "Granted") {
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (action === "Restricted") {
    return "border-red-400/40 bg-red-500/15 text-red-600 dark:text-red-300";
  }
  return "border-sky-400/40 bg-sky-500/15 text-sky-700 dark:text-sky-300";
}

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-indigo-500",
] as const;

function getActorInitials(firstName?: string, lastName?: string): string {
  const first = (firstName ?? "").trim().charAt(0).toUpperCase();
  const last = (lastName ?? "").trim().charAt(0).toUpperCase();
  const initials = `${first}${last}`.trim();
  return initials || "?";
}

function getActorDisplayName(log: PermissionAuditLog): string {
  if (!log.changedBy) return "System Admin";
  return `${log.changedBy.first_name} ${log.changedBy.last_name}`.trim() || "Admin";
}

function avatarColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatPermissionLogTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function buildPermissionLogDescription(log: PermissionAuditLog): string {
  const verb = log.changeType === "Granted" ? "granted" : "restricted";
  return `${verb} ${log.action} permission for ${log.moduleName}`;
}

function PermissionLogsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full border border-white/30 bg-white/25 backdrop-blur-md dark:bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-full border border-white/20 bg-white/25 backdrop-blur-md dark:bg-white/10" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-28 border border-white/20 bg-white/20 backdrop-blur-md dark:bg-white/10" />
              <Skeleton className="h-5 w-16 rounded-full border border-white/20 bg-white/20 backdrop-blur-md dark:bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function summarizeRows(rows: ModulePermissionRow[]) {
  const total = rows.length * MODULE_ACTION_KEYS.length;
  const granted = rows.reduce(
    (sum, row) =>
      sum + MODULE_ACTION_KEYS.filter((key) => row[key]).length,
    0
  );
  const restricted = total - granted;
  const custom = rows.filter((row) => row.status === "Custom").length;
  return {
    total,
    granted,
    restricted,
    custom,
    grantedPercent: total ? Math.round((granted / total) * 100) : 0,
    restrictedPercent: total ? Math.round((restricted / total) * 100) : 0,
  };
}

function DonutChart({
  total,
  sources,
}: {
  total: number;
  sources: { label: string; count: number; percent: number; color: string }[];
}) {
  const data = sources.map((slice) => ({
    name: slice.label,
    value: Math.max(slice.count, 0),
    color: slice.color,
  }));

  return (
    <div className="relative mx-auto size-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={68}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums text-foreground">
          {total}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          Total
        </span>
      </div>
    </div>
  );
}

interface UserPermissionsTabProps {
  user: AdminUserDetail;
  onUserUpdated?: (user: AdminUserDetail) => void;
}

export function UserPermissionsTab({
  user,
  onUserUpdated,
}: UserPermissionsTabProps) {
  const { can } = usePermissions();
  const canEdit = can("Users", "manage");

  const sourcePermissions = useMemo(
    () =>
      normalizeUserPermissions(
        user.permissions,
        user.role || "Staff"
      ),
    [user.permissions, user.role]
  );

  const [rows, setRows] = useState(() => permissionsToRows(sourcePermissions));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionLogs, setPermissionLogs] = useState<PermissionAuditLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);

  const userId = user._id || user.id;

  const loadPermissionLogs = useCallback(async () => {
    if (!userId) {
      setPermissionLogs([]);
      setIsLogsLoading(false);
      return;
    }

    setIsLogsLoading(true);
    try {
      const response = await fetchPermissionLogs(userId);
      setPermissionLogs(response.data.logs);
    } catch (error) {
      toast.error(
        getAdminUsersErrorMessage(error, "Failed to load permission history.")
      );
      setPermissionLogs([]);
    } finally {
      setIsLogsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadPermissionLogs();
  }, [loadPermissionLogs]);

  useEffect(() => {
    if (!isEditing) {
      setRows(permissionsToRows(sourcePermissions));
    }
  }, [sourcePermissions, isEditing]);

  const summary = useMemo(() => summarizeRows(rows), [rows]);

  const restrictedItems = useMemo(
    () =>
      rows.flatMap((row) =>
        MODULE_ACTION_KEYS.filter((key) => !row[key]).map((key) => ({
          id: `${row.module}-${key}`,
          action: `${key.charAt(0).toUpperCase()}${key.slice(1)} ${row.module}`,
          module: row.module,
        }))
      ),
    [rows]
  );

  const sources = useMemo(() => {
    const customCount = summary.custom * MODULE_ACTION_KEYS.length;
    const roleBased = Math.max(summary.granted - customCount, 0);
    const defaults = Math.max(summary.total - roleBased - summary.custom, 0);
    return [
      {
        label: "Default Permissions",
        count: defaults,
        percent: summary.total
          ? Math.round((defaults / summary.total) * 100)
          : 0,
        color: PERMISSION_SOURCES[0]?.color ?? "#8b5cf6",
      },
      {
        label: "Role Based",
        count: roleBased,
        percent: summary.total
          ? Math.round((roleBased / summary.total) * 100)
          : 0,
        color: PERMISSION_SOURCES[1]?.color ?? "#3b82f6",
      },
      {
        label: "Custom Permissions",
        count: summary.custom,
        percent: summary.total
          ? Math.round((summary.custom / summary.total) * 100)
          : 0,
        color: PERMISSION_SOURCES[2]?.color ?? "#22c55e",
      },
    ];
  }, [summary]);

  function toggleCell(module: string, key: ModuleActionKey) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.module !== module) return row;
        const next = { ...row, [key]: !row[key] };
        return { ...next, status: rowStatus(next) };
      })
    );
  }

  function handleCancelEdit() {
    setRows(permissionsToRows(sourcePermissions));
    setIsEditing(false);
  }

  async function handleSave() {
    if (!userId) return;

    setIsSaving(true);
    try {
      const permissions = rowsToPermissions(rows);
      await updateUserPermissions(userId, permissions);
      const refreshed = await fetchAdminUserById(userId);
      onUserUpdated?.(refreshed.data.user);
      setRows(
        permissionsToRows(
          refreshed.data.user.permissions ?? permissions
        )
      );
      setIsEditing(false);
      await loadPermissionLogs();
      toast.success("Permissions saved successfully.", {
        className: glassToastClass,
        description: "Access updates apply on the user's next request.",
      });
    } catch (error) {
      toast.error(
        getAdminUsersErrorMessage(error, "Failed to save permissions.")
      );
    } finally {
      setIsSaving(false);
    }
  }

  const roleLabel = user.role || "Staff";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className={cn(glassCard, "p-4 sm:p-5")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Role & Permission Summary
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div
                className={cn(
                  glassInset,
                  "col-span-2 flex items-center gap-3 p-3 lg:col-span-1"
                )}
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-600 ring-1 ring-sky-400/30">
                  <Shield className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {roleLabel}
                  </p>
                </div>
              </div>

              <div className={cn(glassInset, "p-3")}>
                <p className="text-[11px] text-muted-foreground">
                  Total Permissions
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                  {summary.total}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  All Permissions
                </p>
              </div>

              <div className={cn(glassInset, "p-3")}>
                <p className="text-[11px] text-muted-foreground">Granted</p>
                <p className="text-xl font-bold tabular-nums text-emerald-600 sm:text-2xl dark:text-emerald-400">
                  {summary.granted}
                </p>
                <p className="text-[11px] font-medium text-emerald-600/90">
                  {summary.grantedPercent}%
                </p>
              </div>

              <div className={cn(glassInset, "p-3")}>
                <p className="text-[11px] text-muted-foreground">Restricted</p>
                <p className="text-xl font-bold tabular-nums text-red-500 sm:text-2xl">
                  {summary.restricted}
                </p>
                <p className="text-[11px] font-medium text-red-500/90">
                  {summary.restrictedPercent}%
                </p>
              </div>

              <div className={cn(glassInset, "col-span-2 p-3 sm:col-span-1")}>
                <p className="text-[11px] text-muted-foreground">
                  Custom Modules
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                  {summary.custom}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Not full access
                </p>
              </div>
            </div>
          </section>

          <section className={cn(glassCard, "overflow-hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/30 px-4 py-4 sm:px-5 dark:border-white/10">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Module Permissions
              </h3>
              {canEdit && !isEditing ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-white/40 bg-white/20 backdrop-blur-md hover:bg-white/30 sm:w-auto"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="size-3.5" />
                  Edit Permissions
                </Button>
              ) : null}
            </div>

            {/* Mobile: module cards */}
            <div className="space-y-3 p-3 md:hidden">
              {rows.map((row) => (
                <div
                  key={row.module}
                  className={cn(glassInset, "space-y-3 p-3")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {row.module}
                    </p>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MODULE_ACTION_KEYS.map((key: ModuleActionKey) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 dark:border-white/10 dark:bg-white/5"
                      >
                        <span className="text-[11px] font-medium capitalize text-muted-foreground">
                          {key}
                        </span>
                        {isEditing && canEdit ? (
                          <GlassPermissionToggle
                            allowed={row[key]}
                            disabled={isSaving}
                            onToggle={() => toggleCell(row.module, key)}
                          />
                        ) : (
                          <PermissionIcon allowed={row[key]} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-white/30 bg-white/10 text-left text-[11px] uppercase tracking-wide text-muted-foreground dark:border-white/10">
                    <th className="px-4 py-3 font-semibold">Module</th>
                    {MODULE_ACTION_KEYS.map((key) => (
                      <th
                        key={key}
                        className="px-2 py-3 text-center font-semibold capitalize"
                      >
                        {key}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.module}
                      className="border-b border-white/20 last:border-0 dark:border-white/5"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {row.module}
                      </td>
                      {MODULE_ACTION_KEYS.map((key: ModuleActionKey) => (
                        <td key={key} className="px-2 py-3 text-center">
                          <div className="flex justify-center">
                            {isEditing && canEdit ? (
                              <GlassPermissionToggle
                                allowed={row[key]}
                                disabled={isSaving}
                                onToggle={() => toggleCell(row.module, key)}
                              />
                            ) : (
                              <PermissionIcon allowed={row[key]} />
                            )}
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/30 bg-white/10 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <PermissionIcon allowed />
                  Allowed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PermissionIcon allowed={false} />
                  Restricted
                </span>
                {isEditing ? (
                  <span className="w-full text-sky-700 sm:w-auto dark:text-sky-300">
                    Tap icons to toggle access
                  </span>
                ) : null}
              </div>

              {canEdit && isEditing ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-white/40 bg-white/20 backdrop-blur-md hover:bg-white/30 sm:w-auto"
                    disabled={isSaving}
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-lg shadow-slate-900/20 hover:from-slate-800 hover:to-slate-600 sm:w-auto"
                    disabled={isSaving}
                    onClick={() => void handleSave()}
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save Permissions
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className={cn(glassCard, "p-4 sm:p-5")}>
            <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">
              Permission Sources
            </h3>
            <DonutChart total={summary.total} sources={sources} />
            <div className="mt-4 space-y-2.5">
              {sources.map((slice) => (
                <div
                  key={slice.label}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate text-muted-foreground">
                      {slice.label}
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">
                    {slice.count}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({slice.percent}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className={cn(glassCard, "p-4 sm:p-5")}>
            <h3 className="mb-3 text-base font-semibold tracking-tight text-foreground">
              Restricted Permissions ({restrictedItems.length})
            </h3>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {restrictedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No restricted permissions.
                </p>
              ) : (
                restrictedItems.slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      glassInset,
                      "flex items-center gap-3 px-3 py-2.5"
                    )}
                  >
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-500 ring-1 ring-red-400/25">
                      <Lock className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.action}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {item.module}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="hidden shrink-0 border-red-400/40 bg-red-500/10 text-[10px] text-red-600 sm:inline-flex"
                    >
                      Restricted
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={cn(glassCard, "p-4 sm:p-5")}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Recent Permission Changes
              </h3>
            </div>
            <div className="space-y-3">
              {isLogsLoading ? (
                <PermissionLogsSkeleton />
              ) : permissionLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No permission changes recorded yet.
                </p>
              ) : (
                permissionLogs.map((log) => {
                  const actorName = getActorDisplayName(log);
                  const actorInitials = getActorInitials(
                    log.changedBy?.first_name,
                    log.changedBy?.last_name
                  );

                  return (
                    <div key={log._id} className="flex gap-3">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md",
                          avatarColorFromName(actorName)
                        )}
                      >
                        {actorInitials}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm leading-snug text-foreground">
                          <span className="font-semibold">{actorName}</span>{" "}
                          {buildPermissionLogDescription(log)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {formatPermissionLogTimestamp(log.createdAt)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              actionBadgeClass(log.changeType)
                            )}
                          >
                            {log.changeType}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      <div
        className={cn(
          glassCard,
          "flex items-start gap-3 border-sky-300/40 bg-sky-500/10 px-4 py-3 dark:bg-sky-500/10"
        )}
      >
        <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
        <p className="text-sm text-sky-950/80 dark:text-sky-100/80">
          Permissions define what actions a user can perform across the system.
          Changes take effect on the user&apos;s next authenticated request.
        </p>
      </div>
    </div>
  );
}
