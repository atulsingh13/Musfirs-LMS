import { useMemo, useState } from "react";
import {
  CalendarDays,
  IdCard,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminResetPassword,
  changeUserStatus,
  getAdminUsersErrorMessage,
  type AdminUserDetail,
  type AdminUserStatus,
} from "@/services/admin-users-api";
import { getProfilePictureUrl } from "@/services/users-api";
import { getUserOverviewData } from "@/lib/static-data/user-overview";
import type { MockAdminUser } from "@/lib/static-data/users";
import { UserPermissionsTab } from "@/components/admin/user-permissions-tab";
import { RequirePermission } from "@/components/auth/require-permission";
import { UserDetailsSkeleton } from "@/components/skeletons";
import { usePermissions } from "@/hooks/usePermissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const glassCard =
  "rounded-2xl border border-white/40 bg-white/15 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-lg dark:border-white/10 dark:bg-white/5";

const glassInset =
  "rounded-xl border border-white/30 bg-white/20 backdrop-blur-md dark:border-white/10 dark:bg-white/5";

const glassMenuContent =
  "border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/15 dark:bg-white/10";

const glassDialog =
  "border border-white/50 bg-white/70 shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/15 dark:bg-white/10";

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/25 py-2.5 last:border-0 dark:border-white/10">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value?.trim() ? value : "—"}
      </span>
    </div>
  );
}

interface UserDetailPageContentProps {
  user: AdminUserDetail;
  isLoading?: boolean;
  onEdit?: () => void;
  onUserUpdated?: (user: AdminUserDetail) => void;
}

export function UserDetailPageContent({
  user,
  isLoading,
  onEdit,
  onUserUpdated,
}: UserDetailPageContentProps) {
  const { can } = usePermissions();
  const canManagePermissions = can("Users", "manage");
  const [tab, setTab] = useState("Profile");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null
  );
  const overview = useMemo(
    () => getUserOverviewData(user as MockAdminUser),
    [user]
  );
  const avatarUrl = getProfilePictureUrl(user.avatarUrl);
  const isSuspended = user.status === "Suspended";
  const userKey = user.id || user._id;

  async function handleResetPassword() {
    setIsSubmitting(true);
    try {
      const response = await adminResetPassword(userKey);
      setTemporaryPassword(response.data.temporaryPassword);
      toast.success("Password reset successfully.");
    } catch (error) {
      toast.error(getAdminUsersErrorMessage(error, "Failed to reset password."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus() {
    const nextStatus: AdminUserStatus = isSuspended ? "Active" : "Suspended";

    setIsSubmitting(true);
    try {
      const response = await changeUserStatus(userKey, nextStatus);
      toast.success(
        nextStatus === "Suspended"
          ? "User suspended successfully."
          : "User activated successfully."
      );
      setIsStatusOpen(false);
      onUserUpdated?.(response.data.user);
    } catch (error) {
      toast.error(getAdminUsersErrorMessage(error, "Failed to update status."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <UserDetailsSkeleton />;
  }

  return (
    <div className="relative flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.10),_transparent_45%)]"
      />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <RequirePermission module="Users" action="edit">
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 bg-white/10 text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-md hover:bg-white/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              onClick={onEdit}
            >
              Edit User
            </Button>
          </RequirePermission>
          <RequirePermission module="Users" action="manage">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="border-white/40 bg-white/20 backdrop-blur-md"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className={glassMenuContent}>
                <DropdownMenuItem
                  onClick={() => {
                    setTemporaryPassword(null);
                    setIsResetOpen(true);
                  }}
                >
                  Reset password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant={isSuspended ? "default" : "destructive"}
                  className={
                    isSuspended
                      ? undefined
                      : "text-red-500 focus:text-red-500"
                  }
                  onClick={() => setIsStatusOpen(true)}
                >
                  {isSuspended ? "Activate user" : "Suspend user"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
        </div>
      </div>

      {/* Frosted header */}
      <section className={cn(glassCard, "p-5")}>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-20 w-20 ring-2 ring-white/50 shadow-lg">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-slate-800 to-blue-900 text-lg font-semibold text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              {user.status === "Active" ? (
                <span className="absolute bottom-1 right-1 size-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              ) : null}
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {user.name}
                </h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5",
                    user.status === "Active"
                      ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-700 shadow-[0_0_16px_rgba(16,185,129,0.25)] dark:text-emerald-300"
                      : user.status === "Suspended"
                        ? "border-red-400/40 bg-red-500/15 text-red-600"
                        : "border-amber-400/40 bg-amber-500/15 text-amber-700"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      user.status === "Active"
                        ? "bg-emerald-500"
                        : user.status === "Suspended"
                          ? "bg-red-500"
                          : "bg-amber-500"
                    )}
                  />
                  {user.status}
                </Badge>
                <Badge className="border-sky-400/40 bg-sky-500/15 text-sky-800 dark:text-sky-200">
                  {user.role}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <IdCard className="size-3.5" />
                  {user.employeeId || "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {user.officialEmail || user.email}
                </span>
                
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {user.mobileNumber || user.phone || "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  Joined {formatDate(user.joiningDate ?? user.joinedDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            {[
              {
                label: "Leads Handled",
                value: overview.stats.totalProjects,
              },
              {
                label: "Follow-ups Done",
                value: overview.stats.tasksCompleted,
              }
            ].map((stat) => (
              <div key={stat.label} className={cn(glassInset, "px-3 py-2.5")}>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList
          variant="line"
          className={cn(
            glassCard,
            "h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl p-1"
          )}
        >
          <TabsTrigger
            value="Profile"
            className="px-4 data-active:after:bg-sky-500 data-active:after:opacity-100 data-active:after:shadow-[0_0_12px_rgba(59,130,246,0.8)] data-active:text-sky-700 dark:data-active:text-sky-300"
          >
            Profile
          </TabsTrigger>
          {canManagePermissions ? (
            <TabsTrigger
              value="Permissions"
              className="px-4 data-active:after:bg-sky-500 data-active:after:opacity-100 data-active:after:shadow-[0_0_12px_rgba(59,130,246,0.8)] data-active:text-sky-700 dark:data-active:text-sky-300"
            >
              Permissions
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="Profile" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <section className={cn(glassCard, "p-5")}>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                Personal Information
              </h3>
              <InfoRow label="Full Name" value={user.name} />
              <InfoRow label="Date of Birth" value={formatDate(user.dob)} />
              <InfoRow label="Gender" value={user.gender} />
              <InfoRow
                label="Blood Group"
                value={overview.personal.bloodGroup}
              />
              <InfoRow
                label="Marital Status"
                value={overview.personal.maritalStatus}
              />
              <InfoRow
                label="Languages"
                value={overview.personal.languages.join(", ")}
              />
              <InfoRow label="Address" value={user.address} />
            </section>

            <section className={cn(glassCard, "p-5")}>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                Work Information
              </h3>
              <InfoRow label="Employee ID" value={user.employeeId} />
              <InfoRow label="Role" value={user.role} />
              <InfoRow
                label="Date of Joining"
                value={formatDate(user.joiningDate ?? user.joinedDate)}
              />
            </section>

            <section className={cn(glassCard, "p-5")}>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                Contact Information
              </h3>
              <InfoRow
                label="Email"
                value={user.officialEmail || user.email}
              />
              <InfoRow label="Personal Email" value={user.personalEmail} />
              <InfoRow
                label="Phone"
                value={user.mobileNumber || user.phone}
              />
              <InfoRow
                label="Alternate Phone"
                value={overview.personal.alternatePhone}
              />
              <InfoRow
                label="Emergency Contact"
                value={user.emergencyContactName || "—"}
              />
              <InfoRow
                label="Emergency Phone"
                value={user.emergencyPhone || "—"}
              />
            </section>
          </div>
        </TabsContent>

        {canManagePermissions ? (
          <TabsContent value="Permissions" className="mt-4">
            <UserPermissionsTab user={user} onUserUpdated={onUserUpdated} />
          </TabsContent>
        ) : null}
      </Tabs>

      <Dialog
        open={isResetOpen}
        onOpenChange={(open) => {
          setIsResetOpen(open);
          if (!open) setTemporaryPassword(null);
        }}
      >
        <DialogContent className={glassDialog}>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Generate a new temporary password for{" "}
              <span className="font-medium text-foreground">{user.name}</span>?
            </DialogDescription>
          </DialogHeader>
          {temporaryPassword ? (
            <div className="rounded-lg border border-white/40 bg-white/30 p-3 text-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <p className="text-muted-foreground">Temporary password</p>
              <p className="font-mono font-semibold">{temporaryPassword}</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResetOpen(false)}
              disabled={isSubmitting}
            >
              Close
            </Button>
            <Button
              onClick={() => void handleResetPassword()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Confirm Reset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className={glassDialog}>
          <DialogHeader>
            <DialogTitle>
              {isSuspended ? "Activate User" : "Suspend User"}
            </DialogTitle>
            <DialogDescription>
              {isSuspended
                ? "Restore access for this user?"
                : "This user will lose access until reactivated."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStatusOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={isSuspended ? "default" : "destructive"}
              onClick={() => void handleToggleStatus()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating...
                </>
              ) : isSuspended ? (
                "Activate User"
              ) : (
                "Suspend User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
