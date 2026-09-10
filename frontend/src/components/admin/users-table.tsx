import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminResetPassword,
  changeUserStatus,
  fetchAdminUserById,
  fetchAdminUsers,
  getAdminUsersErrorMessage,
  type AdminUser,
  type AdminUserDetail,
  type AdminUserStatus,
} from "@/services/admin-users-api";
import { getProfilePictureUrl } from "@/services/users-api";
import { AddUserModal } from "@/components/admin/add-user-modal";
import { SkeletonTableRow } from "@/components/skeletons";
import { RequirePermission } from "@/components/auth/require-permission";
import { usePermissions } from "@/hooks/usePermissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ROWS_PER_PAGE_OPTIONS = ["10", "25", "50"];

const ROLE_OPTIONS = [
  { value: "all", label: "Role: All" },
  { value: "Administrator", label: "Administrator" },
  { value: "HR", label: "HR" },
  { value: "Manager", label: "Manager" },
  { value: "Employee", label: "Employee" },
  { value: "BDE", label: "BDE" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "Status: All" },
  { value: "Active", label: "Active" },
  { value: "Pending invite", label: "Pending invite" },
  { value: "Suspended", label: "Suspended" },
] as const;

function formatProfileDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
];

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700 hover:bg-green-100 border-green-200";
    case "Suspended":
      return "bg-red-100 text-red-700 hover:bg-red-100 border-red-200";
    case "Pending invite":
    default:
      return "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200";
  }
};

const getStatusDotClass = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-green-500";
    case "Suspended":
      return "bg-red-500";
    case "Pending invite":
    default:
      return "bg-amber-500";
  }
};

function getDisplayStatus(user: AdminUser): AdminUserStatus {
  if (
    user.status === "Active" ||
    user.status === "Suspended" ||
    user.status === "Pending invite"
  ) {
    return user.status;
  }

  return (user.status as AdminUserStatus | undefined) || "Pending invite";
}

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

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatJoinedDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRoleLabel(role: string) {
  if (role === "Administrator" || role === "Owner") return "Owner / Administrator";
  if (role === "BDE") return "Business Development Executive";
  if (role === "Staff") return "Staff";
  return role;
}

function getUserKey(user: { _id?: string; id?: string }) {
  return user._id || user.id || "";
}

const exportHeaders = [
  "Employee ID",
  "Name",
  "Role",
  "Joining Date",
  "Work Location",
  "Probation",
  "Status",
  "Official Email",
  "Personal Email",
  "Mobile",
  "Emergency Contact",
  "Emergency Phone",
  "CTC",
  "Bank Account",
  "IFSC",
  "PAN",
  "Aadhaar",
  "Allocated Assets",
];

type ExportableUser = AdminUser & Partial<AdminUserDetail>;

function getFullUserRow(user: ExportableUser) {
  const joiningDateValue = user.joiningDate ?? user.joinedDate;

  return [
    user.employeeId || "-",
    user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-",
    user.role || "-",
    joiningDateValue
      ? new Date(joiningDateValue).toLocaleDateString()
      : "-",
    user.workLocation || "-",
    user.probationPeriod || "-",
    user.status || "-",
    user.officialEmail || user.email || "-",
    user.personalEmail || "-",
    user.mobileNumber || user.phone || "-",
    user.emergencyContactName || "-",
    user.emergencyPhone || "-",
    user.ctc || "-",
    user.bankAccount || "-",
    user.ifsc || "-",
    user.panNumber || "-",
    user.aadhaarNumber || "-",
    user.allocatedAssets || "-",
  ];
}

export function UsersTable() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canEditUsers = can("Users", "edit");
  const canManageUsersPerm = can("Users", "manage");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [viewUserModalOpen, setViewUserModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [viewProfile, setViewProfile] = useState<AdminUserDetail | null>(null);
  const [isLoadingViewProfile, setIsLoadingViewProfile] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim().replace(/\s+/g, " ")),
      300
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchAdminUsers({
        search: debouncedSearch || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sortBy: "joinedDate",
        sortOrder: "desc",
      });
      setUsers(response.data.users);
    } catch (error) {
      toast.error(getAdminUsersErrorMessage(error, "Failed to load users."));
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!viewUserModalOpen || !selectedUser) {
      setViewProfile(null);
      return;
    }

    const userId = getUserKey(selectedUser);
    if (!userId) return;
    let cancelled = false;

    async function loadViewProfile() {
      setIsLoadingViewProfile(true);
      try {
        const response = await fetchAdminUserById(userId);
        if (!cancelled) setViewProfile(response.data.user);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getAdminUsersErrorMessage(error, "Failed to load user profile.")
          );
          setViewProfile(null);
        }
      } finally {
        if (!cancelled) setIsLoadingViewProfile(false);
      }
    }

    void loadViewProfile();

    return () => {
      cancelled = true;
    };
  }, [viewUserModalOpen, selectedUser]);

  const pageSize = Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => users.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [users, currentPage, pageSize]
  );

  const allPageSelected =
    paginated.length > 0 &&
    paginated.every((user) => selected[getUserKey(user)]);

  function toggleAll(checked: boolean) {
    const next = { ...selected };
    paginated.forEach((user) => {
      next[getUserKey(user)] = checked;
    });
    setSelected(next);
  }

  function openView(user: AdminUser) {
    navigate(`/users/${getUserKey(user)}`);
  }

  function openEdit(user: AdminUser) {
    setSelectedUser(user);
    setIsEditMode(true);
    setIsAddOpen(true);
  }

  function openAddUser() {
    setSelectedUser(null);
    setIsEditMode(false);
    setIsAddOpen(true);
  }

  function openReset(user: AdminUser) {
    setSelectedUser(user);
    setTemporaryPassword(null);
    setIsResetOpen(true);
  }

  function openStatus(user: AdminUser) {
    setSelectedUser(user);
    setIsStatusOpen(true);
  }

  function exportToCSV() {
    const csvRows: string[] = [];
    csvRows.push(exportHeaders.join(","));

    users.forEach((user) => {
      const rowData = getFullUserRow(user);
      const csvStringRow = rowData
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",");
      csvRows.push(csvStringRow);
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", "users_full_export.csv");
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function exportToPDF() {
    const doc = new jsPDF("l", "pt", "a4");

    doc.text("Organization Users - Full Details", 40, 40);

    const tableData = users.map((user) => getFullUserRow(user));

    autoTable(doc, {
      head: [exportHeaders],
      body: tableData,
      startY: 50,
      styles: {
        fontSize: 6,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
      },
      horizontalPageBreak: true,
    });

    doc.save("users_full_export.pdf");
  }

  async function handleResetPassword() {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const response = await adminResetPassword(getUserKey(selectedUser));
      setTemporaryPassword(response.data.temporaryPassword);
      toast.success("Password reset successfully.");
    } catch (error) {
      toast.error(getAdminUsersErrorMessage(error, "Failed to reset password."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus() {
    if (!selectedUser) return;

    const nextStatus: AdminUserStatus =
      selectedUser.status === "Suspended" ? "Active" : "Suspended";

    setIsSubmitting(true);
    try {
      await changeUserStatus(getUserKey(selectedUser), nextStatus);
      toast.success(
        nextStatus === "Suspended"
          ? "User suspended successfully."
          : "User activated successfully."
      );
      setIsStatusOpen(false);
      await loadUsers();
    } catch (error) {
      toast.error(getAdminUsersErrorMessage(error, "Failed to update status."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent py-2 pr-3 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              if (value) {
                setRoleFilter(value);
                setPage(1);
              }
            }}
            items={ROLE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          >
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              if (value) {
                setStatusFilter(value);
                setPage(1);
              }
            }}
            items={STATUS_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RequirePermission module="Users" action="export">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    <Download className="size-3.5" />
                    Export
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
          <RequirePermission module="Users" action="create">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border border-white/20 bg-white/10 text-foreground transition-all hover:bg-white/20 dark:text-white"
              onClick={openAddUser}
            >
              <Plus className="size-3.5" />
              Add User
            </Button>
          </RequirePermission>
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <SkeletonTableRow key={`users-skeleton-${index}`} />
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No users match your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((user) => {
                const userKey = getUserKey(user);
                const displayStatus = getDisplayStatus(user);
                const avatarUrl = getProfilePictureUrl(user.avatarUrl);

                return (
                  <TableRow key={userKey}>
                    <TableCell>
                      <Checkbox
                        checked={!!selected[userKey]}
                        onCheckedChange={(value) =>
                          setSelected((prev) => ({
                            ...prev,
                            [userKey]: Boolean(value),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          {avatarUrl ? (
                            <AvatarImage src={avatarUrl} alt={user.name} />
                          ) : null}
                          <AvatarFallback
                            className={cn(
                              "text-[10px] font-semibold text-white",
                              getAvatarColor(user.name)
                            )}
                          >
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            to={`/users/${userKey}`}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2"
                          >
                            {user.name}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {getRoleLabel(user.role)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 border",
                          getStatusBadgeVariant(displayStatus)
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            getStatusDotClass(displayStatus)
                          )}
                        />
                        {displayStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatJoinedDate(user.joinedDate)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-xs">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(user)}>
                            View profile
                          </DropdownMenuItem>
                          {canEditUsers ? (
                            <DropdownMenuItem onClick={() => openEdit(user)}>
                              Edit user
                            </DropdownMenuItem>
                          ) : null}
                          {canManageUsersPerm ? (
                            <DropdownMenuItem onClick={() => openReset(user)}>
                              Reset password
                            </DropdownMenuItem>
                          ) : null}
                          {canManageUsersPerm ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openStatus(user)}
                              >
                                {user.status === "Suspended"
                                  ? "Activate user"
                                  : "Suspend user"}
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page</span>
          <Select
            value={rowsPerPage}
            onValueChange={(value) => {
              if (value) {
                setRowsPerPage(value);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROWS_PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={viewUserModalOpen}
        onOpenChange={(open) => {
          setViewUserModalOpen(open);
          if (!open) {
            setViewProfile(null);
            setSelectedUser(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              Read-only view of organization member details.
            </DialogDescription>
          </DialogHeader>
          {isLoadingViewProfile ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading profile...
            </div>
          ) : viewProfile ? (
            <div className="grid gap-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField label="Employee ID" value={viewProfile.employeeId} />
                <ProfileField
                  label="Date of Joining"
                  value={formatProfileDate(
                    viewProfile.joiningDate ?? viewProfile.joinedDate
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField label="First Name" value={viewProfile.firstName} />
                <ProfileField label="Last Name" value={viewProfile.lastName} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField label="Work Location" value={viewProfile.workLocation} />
                <ProfileField label="Probation Period" value={viewProfile.probationPeriod} />
              </div>
              <ProfileField label="Employee Status" value={viewProfile.employeeStatus} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField label="Official Email" value={viewProfile.officialEmail || viewProfile.email} />
                <ProfileField label="Personal Email" value={viewProfile.personalEmail} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField label="Mobile Number" value={viewProfile.mobileNumber || viewProfile.phone} />
                <ProfileField label="Alternate Phone" value={viewProfile.alternatePhone} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField
                  label="Emergency Contact"
                  value={viewProfile.emergencyContactName}
                />
                <ProfileField
                  label="Emergency Phone"
                  value={viewProfile.emergencyPhone}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField label="Role" value={getRoleLabel(viewProfile.role)} />
                <ProfileField label="Account Status" value={viewProfile.status} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField label="CTC / Salary" value={viewProfile.ctc} />
                <ProfileField label="Bank Account" value={viewProfile.bankAccount} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField label="IFSC" value={viewProfile.ifsc} />
                <ProfileField label="PAN Number" value={viewProfile.panNumber} />
              </div>
              <ProfileField label="Allocated Assets" value={viewProfile.allocatedAssets} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AddUserModal
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedUser(null);
          }
        }}
        onCreated={loadUsers}
        isEditMode={isEditMode}
        selectedUser={selectedUser}
      />

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Generate a new temporary password for{" "}
              <span className="font-medium text-foreground">
                {selectedUser?.name}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          {temporaryPassword ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
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
            <Button onClick={handleResetPassword} disabled={isSubmitting}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.status === "Suspended"
                ? "Activate User"
                : "Suspend User"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.status === "Suspended"
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
              variant={
                selectedUser?.status === "Suspended" ? "default" : "destructive"
              }
              onClick={handleToggleStatus}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating...
                </>
              ) : selectedUser?.status === "Suspended" ? (
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
