import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Tag,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageShell } from "@/components/layout/page-shell";
import { RequirePermission } from "@/components/auth/require-permission";
import { LeadDetailsModal } from "@/components/leads/lead-details-modal";
import { ImportLeadsModal } from "@/components/leads/import-leads-modal";
import { usePermissions } from "@/hooks/usePermissions";
import {
  downloadQuotation,
  sendWhatsAppMessage,
} from "@/lib/lead-share";
import {
  StatCardSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton-loaders";
import {
  assignLead,
  bulkAssignLeads,
  bulkUpdateLeadStatus,
  createLead,
  formatLeadDateLabel,
  formatLeadUserName,
  getAllLeads,
  getLeadById,
  getLeadErrorMessage,
  getLeadStats,
  LEAD_GENDER_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_SOURCE_SELECT_OPTIONS,
  LEAD_STATUS_OPTIONS,
  updateLead,
  updateLeadFollowUp,
  updateLeadStatus,
  type ApiLead,
  type LeadGender,
  type LeadSourcePreset,
  type LeadStatus,
} from "@/services/lead-api";
import {
  getAllUsers,
  type ApiUserRef,
} from "@/services/users-api";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const glassModalClass =
  "border border-white/50 bg-white/90 shadow-[0_16px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/15 dark:bg-zinc-950/90";

const glassCurrentCardClass =
  "rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-md dark:border-white/10 dark:bg-white/5";

const glassCurrentBadgeClass =
  "rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 backdrop-blur-sm dark:border-white/10 dark:bg-white/10 dark:text-violet-300";

const statCardClass =
  "glass-card flex items-center gap-4 rounded-xl p-4";

const tableShellClass =
  "glass-panel no-scrollbar w-full shrink-0 overflow-x-auto rounded-t-lg";

const paginationShellClass =
  "glass-panel mb-4 shrink-0 rounded-b-lg border-t-0";

const filterSelectClass = "glass-inset w-full sm:w-[160px]";

const glassInputClass =
  "w-full rounded-full pl-9 border-white/35 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur-md placeholder:text-muted-foreground/70 focus-visible:border-white/55 focus-visible:bg-white/35 focus-visible:ring-2 focus-visible:ring-violet-400/25 dark:border-white/20 dark:bg-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.25)] dark:placeholder:text-white/45 dark:focus-visible:border-white/35 dark:focus-visible:bg-white/15 dark:focus-visible:ring-violet-400/20";

const glassSelectClass =
  "border-border/60 bg-background/60 backdrop-blur-md";

const glassListItemClass =
  "flex w-full items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-left transition-colors backdrop-blur-md hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60";

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

const numberInputClass =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function sanitizeAlphaSpace(value: string) {
  return value.replace(/[^a-zA-Z\s]/g, "");
}

function sanitizeContactNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value.trim());
}

function preventNumberInputScroll(e: React.WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
}

function resolveLeadSourceSelection(source: string): {
  selection: LeadSourcePreset;
  custom: string;
} {
  if (LEAD_SOURCE_SELECT_OPTIONS.includes(source as LeadSourcePreset)) {
    return { selection: source as LeadSourcePreset, custom: "" };
  }
  return { selection: "Others", custom: source };
}

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-red-500">*</span>
    </Label>
  );
}

function getStaffInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function isStaffUser(user: ApiUserRef) {
  const role = String(user.role ?? "").toLowerCase();
  return role === "staff" || role === "employee" || role === "bde";
}

function getStaffMemberName(user: ApiUserRef) {
  return (
    user.name ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email ||
    "Staff member"
  );
}

function staffMatchesSearch(user: ApiUserRef, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    getStaffMemberName(user),
    user.firstName,
    user.lastName,
    user.email,
    user.designation,
    user.department,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function getStatusUpdatedByLabel(lead: ApiLead) {
  return formatLeadUserName(lead.statusUpdatedBy);
}

function getAssignedStaffLabel(lead: ApiLead) {
  if (lead.assignedToName && lead.assignedToName !== "—") {
    return lead.assignedToName;
  }
  return formatLeadUserName(lead.assignedTo);
}

function getAssignedToFullName(lead: ApiLead) {
  if (lead.assignedTo) {
    const full = `${lead.assignedTo.first_name ?? ""} ${lead.assignedTo.last_name ?? ""}`.trim();
    if (full) return full;
    if (lead.assignedTo.name && lead.assignedTo.name !== "—") {
      return lead.assignedTo.name;
    }
  }
  const fallback = getAssignedStaffLabel(lead);
  return fallback !== "—" ? fallback : "";
}

function isLeadAssigned(lead: ApiLead) {
  return Boolean(lead.assignedTo?._id || getAssignedToFullName(lead));
}

type DateRangePreset = "all" | "this_month" | "last_7_days" | "last_30_days";

type LeadFilters = {
  search: string;
  status: string;
  source: string;
  dateRange: { startDate: string; endDate: string } | null;
  datePreset: DateRangePreset;
  destination: string;
  numberOfPax: string;
  followUpsDueToday: boolean;
  createdToday: boolean;
};

const EMPTY_LEAD_STATS = {
  totalLeads: 0,
  newLeadsThisMonth: 0,
  inProgress: 0,
  dealWon: 0,
  lostLeads: 0,
};

const DEFAULT_FILTERS: LeadFilters = {
  search: "",
  status: "all",
  source: "all",
  dateRange: null,
  datePreset: "all",
  destination: "",
  numberOfPax: "all",
  followUpsDueToday: false,
  createdToday: false,
};

function parseLeadFiltersFromSearchParams(
  params: URLSearchParams
): LeadFilters {
  const status = params.get("status")?.trim() || "all";
  return {
    ...DEFAULT_FILTERS,
    status,
    search: params.get("search")?.trim().replace(/\s+/g, " ") ?? "",
    followUpsDueToday: params.get("followUp") === "today",
    createdToday: params.get("created") === "today",
  };
}

/** Stable key for filter-relevant URL params (ignores `view`). */
function leadFilterSearchKey(params: URLSearchParams) {
  const status = params.get("status") ?? "";
  const followUp = params.get("followUp") ?? "";
  const created = params.get("created") ?? "";
  const search = params.get("search") ?? "";
  return `${status}|${followUp}|${created}|${search}`;
}

const PAX_FILTER_OPTIONS = ["all", "1", "2", "3", "4", "5", "6+"] as const;

const LEAD_EXPORT_HEADERS = [
  "Name",
  "Age",
  "Gender",
  "Destination",
  "Number of Pax",
  "Contact Number",
  "Date of Travel",
  "Email",
  "City",
  "Lead Source",
  "Campaign",
  "Status",
  "Next Follow-up",
] as const;

function leadToExportRow(lead: ApiLead): string[] {
  return [
    lead.name,
    String(lead.age),
    lead.gender,
    lead.destination,
    String(lead.numberOfPax),
    lead.contactNumber,
    formatLeadDateLabel(lead.dateOfTravel),
    lead.email,
    lead.city,
    lead.source || lead.leadSource,
    lead.campaign,
    lead.status,
    lead.nextFollowUp
      ? new Date(lead.nextFollowUp).toLocaleString("en-IN")
      : "—",
  ];
}

const LEADS_PAGE_SIZE = 10;
const LEAD_TABLE_HEADER_PX = 40;
const LEAD_TABLE_ROW_PX = 56;
const LEAD_TABLE_HEIGHT_PX =
  LEAD_TABLE_HEADER_PX + LEADS_PAGE_SIZE * LEAD_TABLE_ROW_PX;

/** Shared column sizing — keep `<th>` and `<td>` aligned via colgroup + these classes. */
const leadTableCol = {
  select: "px-2 text-center",
  name: "px-3 text-left",
  destination: "px-3 text-left",
  assignedTo: "w-[168px] max-w-[168px] px-3 text-left",
  pax: "px-2 text-center tabular-nums",
  contact: "px-3 text-left",
  travelDate: "px-3 text-left whitespace-nowrap",
  source: "px-3 text-left",
  status: "px-3 text-left",
  actions: "pl-2 pr-[13px] text-center",
} as const;

function LeadTableColgroup() {
  return (
    <colgroup>
      <col style={{ width: 40 }} />
      <col style={{ width: 148 }} />
      <col style={{ width: 96 }} />
      <col style={{ width: 168 }} />
      <col style={{ width: 48 }} />
      <col style={{ width: 120 }} />
      <col style={{ width: 118 }} />
      <col style={{ width: 108 }} />
      <col style={{ width: 148 }} />
      <col style={{ width: 56 }} />
    </colgroup>
  );
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveDateRange(
  preset: DateRangePreset
): { startDate: string; endDate: string } | null {
  if (preset === "all") return null;

  const now = new Date();
  const endDate = toDateInputValue(now);

  if (preset === "this_month") {
    return {
      startDate: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
      endDate,
    };
  }

  const start = new Date(now);
  start.setDate(now.getDate() - (preset === "last_7_days" ? 7 : 30));
  return { startDate: toDateInputValue(start), endDate };
}

function toDatetimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getSourceStyles(source?: string | null) {
  switch (source) {
    case "Website":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
    case "Referral":
      return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300";
    case "Meta":
    case "Meta Ads":
      return "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300";
    case "Google":
    case "Google Ads":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusBadgeStyles(status: string) {
  switch (status) {
    case "New Lead":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
    case "Qualification Pending":
      return "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300";
    case "Qualified":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300";
    case "Plan Shared":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300";
    case "Hot / Payment Pending":
    case "Payment Pending":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300";
    case "Advance Paid":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    case "Booked":
      return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300";
    case "Follow-up Later":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300";
    case "Not Interested":
    case "Not Qualified":
    case "Closed":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
    case "Travel Completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusLabel(status: string) {
  return status;
}

/** Digits only for tel / WhatsApp (keeps country code). */
function toPhoneDigits(contactNumber: string) {
  return contactNumber.replace(/\D/g, "");
}

function openLeadCall(contactNumber?: string | null) {
  const digits = toPhoneDigits(contactNumber ?? "");
  if (!digits) {
    toast.error("No contact number available for this lead.");
    return;
  }
  window.location.href = `tel:+${digits}`;
}

function openLeadWhatsApp(lead: ApiLead) {
  sendWhatsAppMessage(lead);
}

function openLeadEmail(email?: string | null) {
  const address = email?.trim() ?? "";
  if (!address) {
    toast.error("No email available for this lead.");
    return;
  }
  window.open(
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(address)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function getPageNumbers(current: number, total: number) {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (current <= 3) return [1, 2, 3, 4, "...", total];
  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function LeadsPage() {
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewLeadId = searchParams.get("view");
  const canViewLeads = can("Leads", "view");
  const canEditLeads = can("Leads", "edit");
  const canManageUsers = can("Users", "manage");
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState<LeadFilters>(() =>
    parseLeadFiltersFromSearchParams(searchParams)
  );
  const [filters, setFilters] = useState<LeadFilters>(() =>
    parseLeadFiltersFromSearchParams(searchParams)
  );
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: LEADS_PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [stats, setStats] = useState(EMPTY_LEAD_STATS);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<ApiLead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<LeadGender>("Male");
  const [destination, setDestination] = useState("");
  const [numberOfPax, setNumberOfPax] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [dateOfTravel, setDateOfTravel] = useState(todayDateString());
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [leadSourceSelection, setLeadSourceSelection] =
    useState<LeadSourcePreset>("Website");
  const [customLeadSource, setCustomLeadSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const [status, setStatus] = useState<LeadStatus>("New Lead");

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [followUpDatetime, setFollowUpDatetime] = useState("");
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedViewLead, setSelectedViewLead] = useState<ApiLead | null>(
    null
  );
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignLeadTarget, setAssignLeadTarget] = useState<ApiLead | null>(
    null
  );
  const [staffMembers, setStaffMembers] = useState<ApiUserRef[]>([]);
  const [assignStaffSearch, setAssignStaffSearch] = useState("");
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isAssigningLead, setIsAssigningLead] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>("New Lead");
  const [isBulkStatusSubmitting, setIsBulkStatusSubmitting] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkAssignStaffId, setBulkAssignStaffId] = useState("");
  const [isBulkAssignSubmitting, setIsBulkAssignSubmitting] = useState(false);

  const filteredStaffMembers = useMemo(() => {
    return staffMembers.filter((staff) =>
      staffMatchesSearch(staff, assignStaffSearch)
    );
  }, [staffMembers, assignStaffSearch]);

  const allVisibleSelected =
    leads.length > 0 && leads.every((lead) => selectedLeads.includes(lead._id));
  const someVisibleSelected =
    leads.some((lead) => selectedLeads.includes(lead._id)) &&
    !allVisibleSelected;
  const singleSelectedLead =
    selectedLeads.length === 1
      ? leads.find((lead) => lead._id === selectedLeads[0]) ?? null
      : null;
  const currentAssigneeStaff =
    singleSelectedLead?.assignedTo?._id
      ? staffMembers.find(
          (staff) => staff._id === singleSelectedLead.assignedTo?._id
        )
      : undefined;

  const loadStats = useCallback(async () => {
    try {
      const response = await getLeadStats();
      setStats(response.data.stats);
    } catch {
      // Keep last known stats on transient failures
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getAllLeads({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search.trim().replace(/\s+/g, " ") || undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        source: filters.source !== "all" ? filters.source : undefined,
        leadSource: filters.source !== "all" ? filters.source : undefined,
        startDate: filters.dateRange?.startDate,
        endDate: filters.dateRange?.endDate,
        destination: filters.destination.trim() || undefined,
        numberOfPax:
          filters.numberOfPax !== "all" ? filters.numberOfPax : undefined,
        followUpsDueToday: filters.followUpsDueToday || undefined,
        createdToday: filters.createdToday || undefined,
      });

      setLeads(response.data.leads);
      setPagination((prev) => ({
        ...prev,
        total:
          response.data.pagination?.total ??
          response.total ??
          response.data.leads.length,
        pages: response.data.pagination?.pages ?? response.pages ?? 1,
        page:
          response.data.pagination?.currentPage ??
          response.currentPage ??
          prev.page,
        limit: response.data.pagination?.limit ?? prev.limit,
      }));
    } catch (error) {
      toast.error(getLeadErrorMessage(error, "Failed to load leads."));
      setLeads([]);
      setPagination((prev) => ({ ...prev, total: 0, pages: 1 }));
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.limit, pagination.page]);

  useEffect(() => {
    if (!canViewLeads) return;
    void loadLeads();
  }, [loadLeads, canViewLeads]);

  useEffect(() => {
    if (!canViewLeads) return;
    void loadStats();
  }, [loadStats, canViewLeads]);

  // Re-hydrate filters when Dashboard KPI navigation changes URL params
  // (ignore `view=` only changes). Skip first run — state already initialized.
  const filterSearchKey = useMemo(
    () => leadFilterSearchKey(searchParams),
    [searchParams]
  );
  const skipNextFilterHydration = useRef(true);

  useEffect(() => {
    if (skipNextFilterHydration.current) {
      skipNextFilterHydration.current = false;
      return;
    }
    const next = parseLeadFiltersFromSearchParams(searchParams);
    setDraftFilters(next);
    setFilters(next);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filterSearchKey, searchParams]);

  useEffect(() => {
    if (!viewLeadId || !canViewLeads) return;

    const leadId = viewLeadId;
    let cancelled = false;

    async function openLeadFromQuery() {
      try {
        const response = await getLeadById(leadId);
        if (cancelled) return;
        setSelectedViewLead(response.data.lead);
        setIsViewModalOpen(true);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getLeadErrorMessage(error, "Failed to load lead details.")
          );
        }
      } finally {
        if (!cancelled) {
          setSearchParams({}, { replace: true });
        }
      }
    }

    void openLeadFromQuery();

    return () => {
      cancelled = true;
    };
  }, [viewLeadId, canViewLeads, setSearchParams]);

  const pageNumbers = useMemo(
    () => getPageNumbers(pagination.page, Math.max(pagination.pages, 1)),
    [pagination.page, pagination.pages]
  );

  const showingFrom =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;
  const showingTo = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );

  if (!canViewLeads) {
    return <Navigate to="/dashboard" replace />;
  }

  function applyFilters() {
    const nextFilters: LeadFilters = {
      ...draftFilters,
      search: draftFilters.search.trim().replace(/\s+/g, " "),
      dateRange: resolveDateRange(draftFilters.datePreset),
    };
    setDraftFilters((prev) => ({
      ...prev,
      search: nextFilters.search,
    }));
    setFilters(nextFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setMoreFiltersOpen(false);
  }

  function resetFilters() {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setMoreFiltersOpen(false);
    const view = searchParams.get("view");
    if (view) {
      setSearchParams({ view }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  /** Clear more-filters only, then apply immediately. */
  function clearMoreFiltersAndApply() {
    const nextDraft: LeadFilters = {
      ...draftFilters,
      destination: "",
      numberOfPax: "all",
      followUpsDueToday: false,
    };
    setDraftFilters(nextDraft);
    setFilters({
      ...nextDraft,
      dateRange: resolveDateRange(nextDraft.datePreset),
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
    setMoreFiltersOpen(false);
  }

  async function fetchLeadsForExport(): Promise<ApiLead[]> {
    const response = await getAllLeads({
      page: 1,
      limit: 10000,
      search: filters.search.trim().replace(/\s+/g, " ") || undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      source: filters.source !== "all" ? filters.source : undefined,
      startDate: filters.dateRange?.startDate,
      endDate: filters.dateRange?.endDate,
      destination: filters.destination.trim() || undefined,
      numberOfPax:
        filters.numberOfPax !== "all" ? filters.numberOfPax : undefined,
      followUpsDueToday: filters.followUpsDueToday || undefined,
      createdToday: filters.createdToday || undefined,
    });
    return response.data.leads;
  }

  async function exportLeadsToExcel() {
    try {
      const exportLeads = await fetchLeadsForExport();
      if (exportLeads.length === 0) {
        toast.error("No leads to export.");
        return;
      }

      const csvRows = [
        LEAD_EXPORT_HEADERS.join(","),
        ...exportLeads.map((lead) =>
          leadToExportRow(lead)
            .map((val) => `"${String(val).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ];

      const blob = new Blob([csvRows.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_export_${todayDateString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${exportLeads.length} leads to Excel.`);
    } catch (error) {
      toast.error(getLeadErrorMessage(error, "Failed to export leads."));
    }
  }

  async function exportLeadsToPdf() {
    try {
      const exportLeads = await fetchLeadsForExport();
      if (exportLeads.length === 0) {
        toast.error("No leads to export.");
        return;
      }

      const doc = new jsPDF("l", "pt", "a4");
      doc.setFontSize(14);
      doc.text("Musafir Leads Export", 40, 36);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 40, 50);

      autoTable(doc, {
        head: [LEAD_EXPORT_HEADERS as unknown as string[]],
        body: exportLeads.map((lead) => leadToExportRow(lead)),
        startY: 60,
        styles: {
          fontSize: 7,
          cellPadding: 3,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
        },
        horizontalPageBreak: true,
      });

      doc.save(`leads_export_${todayDateString()}.pdf`);
      toast.success(`Exported ${exportLeads.length} leads to PDF.`);
    } catch (error) {
      toast.error(getLeadErrorMessage(error, "Failed to export leads."));
    }
  }

  const activeMoreFilterCount = [
    filters.destination.trim() !== "",
    filters.numberOfPax !== "all",
    filters.followUpsDueToday,
  ].filter(Boolean).length;

  function goToPage(page: number) {
    if (page < 1 || page > pagination.pages || page === pagination.page) return;
    setPagination((prev) => ({ ...prev, page }));
  }

  function resetLeadForm() {
    setName("");
    setAge("");
    setGender("Male");
    setDestination("");
    setNumberOfPax("");
    setContactNumber("");
    setDateOfTravel(todayDateString());
    setEmail("");
    setCity("");
    setLeadSourceSelection("Website");
    setCustomLeadSource("");
    setCampaign("");
    setStatus("New Lead");
    setEditingLead(null);
  }

  function openCreateDialog() {
    resetLeadForm();
    setLeadDialogOpen(true);
  }

  function openEditDialog(lead: ApiLead) {
    setEditingLead(lead);
    setName(lead.name);
    setAge(String(lead.age));
    setGender(lead.gender);
    setDestination(lead.destination);
    setNumberOfPax(String(lead.numberOfPax));
    setContactNumber(lead.contactNumber);
    const travelDate = lead.dateOfTravel ? new Date(lead.dateOfTravel) : null;
    setDateOfTravel(
      travelDate && !Number.isNaN(travelDate.getTime())
        ? toDateInputValue(travelDate)
        : todayDateString()
    );
    setEmail(lead.email);
    setCity(lead.city);
    const { selection, custom } = resolveLeadSourceSelection(
      lead.source || lead.leadSource || "Website"
    );
    setLeadSourceSelection(selection);
    setCustomLeadSource(custom);
    setCampaign(lead.campaign);
    setStatus(lead.status);
    setLeadDialogOpen(true);
  }

  function handleEditLead(lead: ApiLead) {
    openEditDialog(lead);
  }

  function handleViewLead(lead: ApiLead) {
    setSelectedViewLead(lead);
    setIsViewModalOpen(true);
  }

  function handleStatusChange(
    leadId: string,
    newStatus: LeadStatus,
    leadForDealWon?: ApiLead
  ) {
    const lead = leadForDealWon ?? leads.find((item) => item._id === leadId);
    if (!lead) return;
    void handleStatusUpdate(lead, newStatus);
  }

  async function handleStatusUpdate(lead: ApiLead, newStatus: LeadStatus) {
    if (lead.status === newStatus) return;

    try {
      await updateLeadStatus(lead._id, newStatus);
      await Promise.all([loadLeads(), loadStats()]);
      setSelectedViewLead((prev) =>
        prev && prev._id === lead._id ? { ...prev, status: newStatus } : prev
      );
      toast.success(`Lead status updated to ${newStatus}.`);
    } catch (error) {
      toast.error(getLeadErrorMessage(error, "Failed to update lead status."));
    }
  }

  async function openAssignModal(lead: ApiLead) {
    setAssignLeadTarget(lead);
    setAssignStaffSearch("");
    setIsAssignModalOpen(true);
    setIsLoadingStaff(true);

    try {
      const response = await getAllUsers();
      const activeStaff = (response.data?.users ?? []).filter(
        (user) => user.isActive !== false && isStaffUser(user)
      );
      setStaffMembers(activeStaff);
    } catch (error) {
      toast.error(getLeadErrorMessage(error, "Failed to load staff members."));
      setStaffMembers([]);
    } finally {
      setIsLoadingStaff(false);
    }
  }

  function closeAssignModal() {
    setIsAssignModalOpen(false);
    setAssignLeadTarget(null);
    setStaffMembers([]);
    setAssignStaffSearch("");
  }

  async function handleAssignLead(staffId: string) {
    if (!assignLeadTarget) return;

    setIsAssigningLead(true);
    try {
      const response = await assignLead(assignLeadTarget._id, staffId);
      await loadLeads();
      const updated = response.data?.lead;
      if (updated) {
        setSelectedViewLead((prev) =>
          prev && prev._id === updated._id ? updated : prev
        );
      }
      toast.success("Lead assigned successfully.");
      closeAssignModal();
    } catch (error) {
      toast.error(getLeadErrorMessage(error, "Failed to assign lead."));
    } finally {
      setIsAssigningLead(false);
    }
  }

  function clearLeadSelection() {
    setSelectedLeads([]);
  }

  function toggleLeadSelection(leadId: string, checked: boolean) {
    setSelectedLeads((prev) => {
      if (checked) {
        return prev.includes(leadId) ? prev : [...prev, leadId];
      }
      return prev.filter((id) => id !== leadId);
    });
  }

  function toggleSelectAllVisible(checked: boolean) {
    const visibleIds = leads.map((lead) => lead._id);
    setSelectedLeads((prev) => {
      if (checked) {
        const merged = new Set([...prev, ...visibleIds]);
        return Array.from(merged);
      }
      return prev.filter((id) => !visibleIds.includes(id));
    });
  }

  async function ensureStaffLoaded() {
    if (staffMembers.length > 0) return;
    setIsLoadingStaff(true);
    try {
      const response = await getAllUsers();
      const activeStaff = (response.data?.users ?? []).filter(
        (user) => user.isActive !== false && isStaffUser(user)
      );
      setStaffMembers(activeStaff);
    } catch (error) {
      toast.error(getLeadErrorMessage(error, "Failed to load staff members."));
      setStaffMembers([]);
    } finally {
      setIsLoadingStaff(false);
    }
  }

  function openBulkStatusModal() {
    const currentStatus = singleSelectedLead?.status;
    setBulkStatus(
      currentStatus &&
        (LEAD_STATUS_OPTIONS as readonly string[]).includes(currentStatus)
        ? (currentStatus as LeadStatus)
        : "New Lead"
    );
    setIsBulkStatusModalOpen(true);
  }

  async function openBulkAssignModal() {
    setBulkAssignStaffId(singleSelectedLead?.assignedTo?._id ?? "");
    setAssignStaffSearch("");
    setIsBulkAssignModalOpen(true);
    await ensureStaffLoaded();
  }

  async function handleBulkStatusSubmit() {
    if (selectedLeads.length === 0) return;

    setIsBulkStatusSubmitting(true);
    try {
      const response = await bulkUpdateLeadStatus(selectedLeads, bulkStatus);
      toast.success(
        response.message ||
          `Updated status for ${response.data.modified} lead(s).`
      );
      setIsBulkStatusModalOpen(false);
      clearLeadSelection();
      await Promise.all([loadLeads(), loadStats()]);
    } catch (error) {
      toast.error(
        getLeadErrorMessage(error, "Failed to update lead statuses.")
      );
    } finally {
      setIsBulkStatusSubmitting(false);
    }
  }

  async function handleBulkAssignSubmit() {
    if (selectedLeads.length === 0 || !bulkAssignStaffId) return;

    setIsBulkAssignSubmitting(true);
    try {
      const response = await bulkAssignLeads(selectedLeads, bulkAssignStaffId);
      toast.success(
        response.message || `Assigned ${response.data.modified} lead(s).`
      );
      setIsBulkAssignModalOpen(false);
      clearLeadSelection();
      await loadLeads();
    } catch (error) {
      toast.error(getLeadErrorMessage(error, "Failed to assign leads."));
    } finally {
      setIsBulkAssignSubmitting(false);
    }
  }

  function closeLeadDialog() {
    setLeadDialogOpen(false);
    resetLeadForm();
  }

  function openFollowUpModal(lead: ApiLead) {
    setSelectedLeadId(lead._id);
    setFollowUpDatetime(toDatetimeLocalValue(lead.nextFollowUp));
    setIsFollowUpModalOpen(true);
  }

  async function handleSaveFollowUp() {
    if (!selectedLeadId) return;
    if (!followUpDatetime) {
      toast.error("Please select a date and time");
      return;
    }

    const parsed = new Date(followUpDatetime);
    if (Number.isNaN(parsed.getTime())) {
      toast.error("Please select a valid date and time");
      return;
    }

    setIsSavingFollowUp(true);
    try {
      await updateLeadFollowUp(selectedLeadId, parsed.toISOString());
      toast.success("Follow-up scheduled!");
      setIsFollowUpModalOpen(false);
      const leadId = selectedLeadId;
      setSelectedLeadId(null);
      setFollowUpDatetime("");
      await loadLeads();
      setSelectedViewLead((prev) =>
        prev && prev._id === leadId
          ? { ...prev, nextFollowUp: parsed.toISOString() }
          : prev
      );
    } catch (error) {
      toast.error(getLeadErrorMessage(error, "Failed to schedule follow-up"));
    } finally {
      setIsSavingFollowUp(false);
    }
  }

  async function handleSubmitLead(e: React.FormEvent) {
    e.preventDefault();

    const ageNum = Number(age);
    const paxNum = Number(numberOfPax);
    const resolvedLeadSource =
      leadSourceSelection === "Others"
        ? customLeadSource.trim()
        : leadSourceSelection;

    if (
      !name.trim() ||
      !age.trim() ||
      !gender ||
      !destination.trim() ||
      !numberOfPax.trim() ||
      !contactNumber.trim() ||
      !dateOfTravel ||
      !email.trim() ||
      !city.trim() ||
      !resolvedLeadSource
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!sanitizeAlphaSpace(name).trim()) {
      toast.error("Name must contain only letters and spaces.");
      return;
    }

    if (!sanitizeAlphaSpace(destination).trim()) {
      toast.error("Destination must contain only letters and spaces.");
      return;
    }

    if (!sanitizeAlphaSpace(city).trim()) {
      toast.error("City must contain only letters and spaces.");
      return;
    }

    if (contactNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit contact number.");
      return;
    }

    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (leadSourceSelection === "Others" && !customLeadSource.trim()) {
      toast.error("Please enter a custom lead source.");
      return;
    }

    if (!Number.isFinite(ageNum) || ageNum <= 0) {
      toast.error("Please enter a valid age.");
      return;
    }

    if (!Number.isFinite(paxNum) || paxNum <= 0) {
      toast.error("Please enter a valid number of travellers.");
      return;
    }

    const payload = {
      name: name.trim(),
      age: ageNum,
      gender,
      destination: destination.trim(),
      numberOfPax: paxNum,
      contactNumber,
      dateOfTravel,
      email: email.trim(),
      city: city.trim(),
      leadSource: resolvedLeadSource,
      source: resolvedLeadSource,
      campaign: campaign.trim(),
      status,
    };

    setIsSubmitting(true);
    try {
      if (editingLead) {
        await updateLead(editingLead._id, payload);
        toast.success("Lead updated successfully.");
      } else {
        await createLead(payload);
        toast.success("Lead created successfully.");
      }

      closeLeadDialog();
      await Promise.all([loadLeads(), loadStats()]);
    } catch (error) {
      toast.error(
        getLeadErrorMessage(
          error,
          editingLead ? "Failed to update lead." : "Failed to create lead."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageShell
        title="Leads"
        description="Capture travel enquiries and convert them into bookings."
        actions={
          <RequirePermission module="Leads" action="create">
            <Button onClick={openCreateDialog} className="w-full sm:w-auto">
              <Plus className="size-4" />
              <span className="sm:hidden">Add Lead</span>
              <span className="hidden sm:inline">Add New Lead</span>
            </Button>
          </RequirePermission>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden">
          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {isLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <div className={statCardClass}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{stats.totalLeads}</h3>
                    <p className="text-xs text-muted-foreground">All time leads</p>
                  </div>
                </div>
                <div className={statCardClass}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400">
                    <TrendingUp className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">
                      {stats.newLeadsThisMonth}
                    </h3>
                    <p className="text-xs text-muted-foreground">New this month</p>
                  </div>
                </div>
                <div className={statCardClass}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{stats.inProgress}</h3>
                    <p className="text-xs text-muted-foreground">In progress</p>
                  </div>
                </div>
                <div className={statCardClass}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{stats.dealWon}</h3>
                    <p className="text-xs text-muted-foreground">Booked</p>
                  </div>
                </div>
                <div className={statCardClass}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                    <XCircle className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{stats.lostLeads}</h3>
                    <p className="text-xs text-muted-foreground">Closed leads</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex min-w-0 shrink-0 flex-col gap-3 overflow-x-hidden sm:gap-4 xl:flex-row xl:items-end xl:flex-wrap">
            <div className="relative min-w-0 w-full flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-foreground/45 dark:text-white/55" />
              <Input
                placeholder="Search by name, destination, city, campaign..."
                value={draftFilters.search}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
                className={glassInputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2 xl:contents">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-wider text-muted-foreground uppercase">
                Status
              </label>
              <Select
                value={draftFilters.status}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    status: value ?? "all",
                  }))
                }
              >
                <SelectTrigger className={filterSelectClass}>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  {LEAD_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-wider text-muted-foreground uppercase">
                Lead Source
              </label>
              <Select
                value={draftFilters.source}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    source: value ?? "all",
                  }))
                }
              >
                <SelectTrigger className={filterSelectClass}>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {LEAD_SOURCE_OPTIONS.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-wider text-muted-foreground uppercase">
                Travel Date
              </label>
              <Select
                value={draftFilters.datePreset}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    datePreset: (value as DateRangePreset) ?? "all",
                  }))
                }
              >
                <SelectTrigger className={filterSelectClass}>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="last_7_days">Last 7 days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center overflow-hidden rounded-lg border border-input bg-card shadow-xs">
                <Popover open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-none border-r border-input"
                        aria-label="Open more filters"
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    }
                  />
                  <PopoverContent
                    align="end"
                    className="w-[min(20rem,calc(100vw-2rem))] space-y-4 p-4"
                  >
                    <PopoverHeader>
                      <PopoverTitle>More filters</PopoverTitle>
                    </PopoverHeader>

                    <div className="space-y-2">
                      <Label htmlFor="filter-destination">Destination</Label>
                      <Input
                        id="filter-destination"
                        placeholder="e.g. Bali, Dubai"
                        value={draftFilters.destination}
                        onChange={(e) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            destination: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Number of Pax</Label>
                      <Select
                        value={draftFilters.numberOfPax}
                        onValueChange={(value) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            numberOfPax: value ?? "all",
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All pax" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAX_FILTER_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option === "all" ? "All pax" : option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border/70 px-3 py-2.5 text-sm">
                      <Checkbox
                        checked={draftFilters.followUpsDueToday}
                        onCheckedChange={(checked) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            followUpsDueToday: checked,
                          }))
                        }
                      />
                      <span>Follow-ups Due Today</span>
                    </label>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearMoreFiltersAndApply}
                      >
                        Clear
                      </Button>
                      <Button type="button" size="sm" onClick={applyFilters}>
                        Apply Filters
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 gap-2 rounded-none px-3"
                  onClick={applyFilters}
                >
                  <Filter className="size-4" />
                  Filters
                  {activeMoreFilterCount > 0 ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {activeMoreFilterCount}
                    </span>
                  ) : null}
                </Button>
              </div>

              <Button
                type="button"
                variant="link"
                className="text-primary"
                onClick={resetFilters}
              >
                Reset
              </Button>

              <RequirePermission module="Leads" action="import">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-card"
                  onClick={() => setIsImportModalOpen(true)}
                >
                  <Upload className="size-4" />
                  Import
                </Button>
              </RequirePermission>

              <RequirePermission module="Leads" action="export">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button type="button" variant="outline" className="bg-card">
                        <Download className="size-4" />
                        Export
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void exportLeadsToExcel()}>
                      Export as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void exportLeadsToPdf()}>
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </RequirePermission>
            </div>
          </div>

          <div
            className={cn(tableShellClass, "md:overflow-x-auto")}
          >
            {isLoading ? (
              <>
                <div className="space-y-2 p-3 md:hidden">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-xl border border-border bg-muted/40"
                    />
                  ))}
                </div>
                <div
                  className="hidden md:block"
                  style={{ height: LEAD_TABLE_HEIGHT_PX }}
                >
                  <TableSkeleton
                    columns={9}
                    rows={LEADS_PAGE_SIZE}
                    headers={[
                      "Name",
                      "Destination",
                      "Assigned To",
                      "Pax",
                      "Contact",
                      "Date of Travel",
                      "Lead Source",
                      "Status",
                      "Actions",
                    ]}
                  />
                </div>
              </>
            ) : leads.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center px-4 py-10">
                <p className="text-center text-sm text-muted-foreground">
                  No leads match your filters. Try adjusting search or create a
                  new lead.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="space-y-2 p-3 md:hidden">
                  {leads.map((lead) => {
                    const source = lead.source || lead.leadSource;
                    return (
                      <div
                        key={lead._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleViewLead(lead)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleViewLead(lead);
                          }
                        }}
                        className={cn(
                          "rounded-xl border border-border bg-card p-3 shadow-sm transition-colors active:bg-muted/40",
                          selectedLeads.includes(lead._id) && "border-primary/40 bg-primary/10"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="pt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedLeads.includes(lead._id)}
                              onCheckedChange={(checked) =>
                                toggleLeadSelection(lead._id, checked)
                              }
                              aria-label={`Select ${lead.name}`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {lead.name}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {lead.destination}
                                  {lead.city ? ` · ${lead.city}` : ""}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium",
                                  getStatusBadgeStyles(lead.status)
                                )}
                              >
                                {getStatusLabel(lead.status)}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>{lead.contactNumber || "—"}</span>
                              <span>
                                {formatLeadDateLabel(lead.dateOfTravel)}
                              </span>
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                  getSourceStyles(source)
                                )}
                              >
                                {source || "Other"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div
                  className="no-scrollbar hidden h-full w-full overflow-x-auto md:block"
                  style={{ height: LEAD_TABLE_HEIGHT_PX }}
                >
                <table className="w-full min-w-[1050px] table-fixed text-left text-sm">
                  <LeadTableColgroup />
                  <thead className="border-b border-border bg-muted/30 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <tr style={{ height: LEAD_TABLE_HEADER_PX }}>
                      <th className={leadTableCol.select}>
                        <Checkbox
                          checked={allVisibleSelected}
                          className={cn(
                            someVisibleSelected &&
                              !allVisibleSelected &&
                              "border-violet-400 bg-violet-600/40"
                          )}
                          onCheckedChange={(checked) =>
                            toggleSelectAllVisible(checked)
                          }
                          aria-label="Select all leads on this page"
                        />
                      </th>
                      <th className={leadTableCol.name}>
                        <span className="inline-flex items-center gap-1">
                          Name <ArrowUpDown className="size-3.5" />
                        </span>
                      </th>
                      <th className={leadTableCol.destination}>Destination</th>
                      <th className={leadTableCol.assignedTo}>Assigned To</th>
                      <th className={leadTableCol.pax}>Pax</th>
                      <th className={leadTableCol.contact}>Contact</th>
                      <th className={leadTableCol.travelDate}>
                        <span className="inline-flex items-center gap-1">
                          Date of Travel <ArrowUpDown className="size-3.5" />
                        </span>
                      </th>
                      <th className={leadTableCol.source}>Lead Source</th>
                      <th className={leadTableCol.status}>Status</th>
                      <th className={leadTableCol.actions}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const source = lead.source || lead.leadSource;

                      return (
                        <tr
                          key={lead._id}
                          onClick={() => handleViewLead(lead)}
                          style={{ height: LEAD_TABLE_ROW_PX }}
                          className={cn(
                            "cursor-pointer border-b border-border bg-card transition-colors hover:bg-muted/40",
                            selectedLeads.includes(lead._id) && "bg-primary/10"
                          )}
                        >
                          <td
                            className={leadTableCol.select}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedLeads.includes(lead._id)}
                              onCheckedChange={(checked) =>
                                toggleLeadSelection(lead._id, checked)
                              }
                              aria-label={`Select ${lead.name}`}
                            />
                          </td>
                          <td className={cn(leadTableCol.name, "overflow-hidden")}>
                            <div className="min-w-0">
                              <p
                                className="truncate text-sm font-semibold text-foreground"
                                title={lead.name}
                              >
                                {lead.name}
                              </p>
                              <p
                                className="mt-0.5 truncate text-xs text-muted-foreground"
                                title={`${lead.city} · ${lead.age} · ${lead.gender}`}
                              >
                                {lead.city} · {lead.age} · {lead.gender}
                              </p>
                            </div>
                          </td>

                          <td
                            className={cn(
                              leadTableCol.destination,
                              "overflow-hidden text-sm font-medium text-foreground/90"
                            )}
                          >
                            <span className="block truncate" title={lead.destination}>
                              {lead.destination}
                            </span>
                          </td>

                          <td className={cn(leadTableCol.assignedTo, "overflow-hidden")}>
                            {isLeadAssigned(lead) ? (
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                                  {getStaffInitials(getAssignedToFullName(lead))}
                                </div>
                                <span
                                  className="min-w-0 line-clamp-2 text-sm leading-snug text-foreground/90"
                                  title={getAssignedToFullName(lead)}
                                >
                                  {getAssignedToFullName(lead)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground/70">
                                N/A
                              </span>
                            )}
                          </td>

                          <td
                            className={cn(
                              leadTableCol.pax,
                              "text-sm text-foreground/90"
                            )}
                          >
                            {lead.numberOfPax}
                          </td>

                          <td
                            className={cn(
                              leadTableCol.contact,
                              "overflow-hidden text-sm text-foreground/90"
                            )}
                          >
                            <span
                              className="block truncate"
                              title={lead.contactNumber}
                            >
                              {lead.contactNumber}
                            </span>
                          </td>

                          <td
                            className={cn(
                              leadTableCol.travelDate,
                              "text-sm text-foreground/90"
                            )}
                          >
                            {formatLeadDateLabel(lead.dateOfTravel)}
                          </td>

                          <td className={cn(leadTableCol.source, "overflow-hidden")}>
                            <span
                              className={cn(
                                "inline-flex max-w-full truncate rounded-md px-2 py-1 text-xs font-medium",
                                getSourceStyles(source)
                              )}
                              title={source || "Other"}
                            >
                              {source || "Other"}
                            </span>
                          </td>

                          <td className={cn(leadTableCol.status, "overflow-hidden")}>
                            <div className="min-w-0 space-y-1">
                              <span
                                className={cn(
                                  "inline-flex max-w-full items-center gap-1.5 truncate rounded-md px-2.5 py-1 text-xs font-medium",
                                  getStatusBadgeStyles(lead.status)
                                )}
                                title={getStatusLabel(lead.status)}
                              >
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                                {getStatusLabel(lead.status)}
                              </span>
                              <p className="truncate text-[10px] text-muted-foreground">
                                Updated by: {getStatusUpdatedByLabel(lead)}
                              </p>
                            </div>
                          </td>

                          <td
                            className={leadTableCol.actions}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-center">
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuGroup>
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <Phone className="mr-2 h-4 w-4" />
                                        Contact
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              openLeadCall(lead.contactNumber)
                                            }
                                          >
                                            <Phone className="mr-2 h-4 w-4" />
                                            Call
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              openLeadWhatsApp(lead)
                                            }
                                          >
                                            <img
                                              src="/assets/icons/whatsapp.svg"
                                              alt=""
                                              className="mr-2 size-4"
                                            />
                                            WhatsApp
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              openLeadEmail(lead.email)
                                            }
                                          >
                                            <Mail className="mr-2 h-4 w-4" />
                                            Email
                                          </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                      </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        void downloadQuotation(
                                          lead._id,
                                          lead.name
                                        )
                                      }
                                    >
                                      <FileText className="mr-2 h-4 w-4" />
                                      Download Quote
                                    </DropdownMenuItem>
                                    {canEditLeads ? (
                                      <DropdownMenuItem
                                        onClick={() => openFollowUpModal(lead)}
                                      >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Schedule Follow-up
                                      </DropdownMenuItem>
                                    ) : null}
                                  </DropdownMenuGroup>
                                  {(canEditLeads || canManageUsers) ? (
                                    <>
                                      <DropdownMenuSeparator />
                                      <RequirePermission
                                        module="Users"
                                        action="manage"
                                      >
                                        <DropdownMenuItem
                                          onClick={() => openAssignModal(lead)}
                                        >
                                          <UserPlus className="mr-2 h-4 w-4" />
                                          Assign Lead
                                        </DropdownMenuItem>
                                      </RequirePermission>
                                      <RequirePermission
                                        module="Leads"
                                        action="edit"
                                      >
                                        <DropdownMenuSub>
                                          <DropdownMenuSubTrigger>
                                            <Tag className="mr-2 h-4 w-4" />
                                            Update Status
                                          </DropdownMenuSubTrigger>
                                          <DropdownMenuPortal>
                                            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                                              {LEAD_STATUS_OPTIONS.map(
                                                (option) => (
                                                  <DropdownMenuItem
                                                    key={option}
                                                    disabled={
                                                      lead.status === option
                                                    }
                                                    className={cn(
                                                      (option === "Booked" ||
                                                        option ===
                                                          "Travel Completed") &&
                                                        "font-medium text-green-600",
                                                      (option ===
                                                        "Not Interested" ||
                                                        option ===
                                                          "Not Qualified") &&
                                                        "text-red-600"
                                                    )}
                                                    onClick={() =>
                                                      handleStatusChange(
                                                        lead._id,
                                                        option,
                                                        option === "Booked"
                                                          ? lead
                                                          : undefined
                                                      )
                                                    }
                                                  >
                                                    {option}
                                                  </DropdownMenuItem>
                                                )
                                              )}
                                            </DropdownMenuSubContent>
                                          </DropdownMenuPortal>
                                        </DropdownMenuSub>
                                      </RequirePermission>
                                    </>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>

          <div className={paginationShellClass}>
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-center text-sm text-muted-foreground sm:text-left">
                <span className="sm:hidden">
                  Page {pagination.page} of {Math.max(pagination.pages, 1)} ·{" "}
                  {pagination.total} leads
                </span>
                <span className="hidden sm:inline">
                  Showing {showingFrom} to {showingTo} of {pagination.total} leads
                </span>
              </p>
              <div className="flex justify-center gap-1 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="hidden gap-1 sm:flex">
                {pageNumbers.map((page, index) =>
                  page === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={page}
                      type="button"
                      variant={
                        pagination.page === page ? "default" : "outline"
                      }
                      size="icon"
                      className="h-8 w-8"
                      disabled={isLoading}
                      onClick={() => goToPage(Number(page))}
                    >
                      {page}
                    </Button>
                  )
                )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={
                    pagination.page >= pagination.pages ||
                    pagination.total === 0 ||
                    isLoading
                  }
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageShell>

      {selectedLeads.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div
            className="pointer-events-auto flex max-w-full flex-wrap items-center gap-3 rounded-2xl border border-white/30 bg-white/20 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] backdrop-blur-lg dark:border-white/15 dark:bg-white/10 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {selectedLeads.length} lead
              {selectedLeads.length === 1 ? "" : "s"} selected
            </p>
            <div className="h-5 w-px bg-white/40 dark:bg-white/20" />
            <RequirePermission module="Leads" action="edit">
              <Button
                type="button"
                size="sm"
                className="border-0 bg-violet-600 text-white hover:bg-violet-700"
                onClick={openBulkStatusModal}
              >
                <Tag className="size-4" />
                Update Status
              </Button>
            </RequirePermission>
            <RequirePermission module="Users" action="manage">
              <Button
                type="button"
                size="sm"
                className="border-0 bg-white/50 text-slate-900 hover:bg-white/70 dark:bg-white/20 dark:text-white dark:hover:bg-white/30"
                onClick={() => void openBulkAssignModal()}
              >
                <UserPlus className="size-4" />
                Assign to Staff
              </Button>
            </RequirePermission>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-slate-700 hover:bg-white/40 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/15 dark:hover:text-white"
              onClick={clearLeadSelection}
              aria-label="Clear selection"
            >
              <X className="size-4" />
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={leadDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeLeadDialog();
          else setLeadDialogOpen(true);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingLead ? "Edit Lead" : "Add New Lead"}
            </DialogTitle>
            <DialogDescription>
              {editingLead
                ? "Update mandatory lead information."
                : "Capture mandatory travel lead information."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitLead} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <RequiredLabel htmlFor="lead-name">Name</RequiredLabel>
                <Input
                  id="lead-name"
                  placeholder="Customer's full name"
                  value={name}
                  onChange={(e) => setName(sanitizeAlphaSpace(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-age">Age</Label>
                <Input
                  id="lead-age"
                  type="number"
                  min={1}
                  placeholder="e.g. 29"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  onWheel={preventNumberInputScroll}
                  className={numberInputClass}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={gender}
                  onValueChange={(v) => v && setGender(v as LeadGender)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="lead-destination">
                  Destination
                </RequiredLabel>
                <Input
                  id="lead-destination"
                  placeholder="Requested destination"
                  value={destination}
                  onChange={(e) =>
                    setDestination(sanitizeAlphaSpace(e.target.value))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-pax">Number of Pax</Label>
                <Input
                  id="lead-pax"
                  type="number"
                  min={1}
                  placeholder="Number of travellers"
                  value={numberOfPax}
                  onChange={(e) => setNumberOfPax(e.target.value)}
                  onWheel={preventNumberInputScroll}
                  className={numberInputClass}
                  required
                />
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="lead-contact">
                  Contact Number
                </RequiredLabel>
                <Input
                  id="lead-contact"
                  placeholder="WhatsApp / mobile number"
                  value={contactNumber}
                  onChange={(e) =>
                    setContactNumber(sanitizeContactNumber(e.target.value))
                  }
                  inputMode="numeric"
                  maxLength={10}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Date of Travel</Label>
                <DatePicker
                  value={dateOfTravel}
                  onChange={setDateOfTravel}
                  placeholder="Select travel date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-email">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-city">City</Label>
                <Input
                  id="lead-city"
                  placeholder="Customer's city"
                  value={city}
                  onChange={(e) => setCity(sanitizeAlphaSpace(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <RequiredLabel>Lead Source</RequiredLabel>
                <Select
                  value={leadSourceSelection}
                  onValueChange={(value) => {
                    if (!value) return;
                    const next = value as LeadSourcePreset;
                    setLeadSourceSelection(next);
                    if (next !== "Others") {
                      setCustomLeadSource("");
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCE_SELECT_OPTIONS.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {leadSourceSelection === "Others" ? (
                <div className="space-y-2">
                  <Label htmlFor="lead-custom-source">Add Lead Source</Label>
                  <Input
                    id="lead-custom-source"
                    placeholder="Enter lead source"
                    value={customLeadSource}
                    onChange={(e) => setCustomLeadSource(e.target.value)}
                    required
                  />
                </div>
              ) : null}

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="lead-campaign">Campaign</Label>
                <Input
                  id="lead-campaign"
                  placeholder="Ad / campaign that generated this lead"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeLeadDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingLead
                    ? "Save Changes"
                    : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFollowUpModalOpen}
        onOpenChange={(open) => {
          setIsFollowUpModalOpen(open);
          if (!open) {
            setSelectedLeadId(null);
            setFollowUpDatetime("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Next Follow-up</DialogTitle>
            <DialogDescription>
              Pick a date and time for the next follow-up on this lead.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-foreground">
              Date & Time
            </label>
            <Input
              type="datetime-local"
              value={followUpDatetime}
              onChange={(e) => setFollowUpDatetime(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFollowUpModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveFollowUp()}
              disabled={isSavingFollowUp}
            >
              {isSavingFollowUp ? "Saving..." : "Save Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAssignModalOpen}
        onOpenChange={(open) => {
          if (!open) closeAssignModal();
        }}
      >
        <DialogContent className={cn("sm:max-w-md", glassModalClass)}>
          <DialogHeader>
            <DialogTitle>Assign Lead</DialogTitle>
            <DialogDescription>
              {assignLeadTarget
                ? `Choose a staff member to assign ${assignLeadTarget.name}.`
                : "Choose a staff member for this lead."}
            </DialogDescription>
          </DialogHeader>

          {!isLoadingStaff && staffMembers.length > 0 ? (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={assignStaffSearch}
                onChange={(e) => setAssignStaffSearch(e.target.value)}
                placeholder="Search staff by name or email…"
                className={cn(glassInputClass, "rounded-lg")}
                autoFocus
              />
            </div>
          ) : null}

          <div className="max-h-72 space-y-2 overflow-y-auto py-2">
            {isLoadingStaff ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading staff members…
              </p>
            ) : staffMembers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No active staff members found.
              </p>
            ) : filteredStaffMembers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No staff members match &ldquo;{assignStaffSearch.trim()}&rdquo;.
              </p>
            ) : (
              filteredStaffMembers.map((staff) => {
                const staffName = getStaffMemberName(staff);
                const isCurrentAssignee =
                  assignLeadTarget?.assignedTo?._id === staff._id;

                return (
                  <button
                    key={staff._id}
                    type="button"
                    disabled={isAssigningLead || isCurrentAssignee}
                    onClick={() => void handleAssignLead(staff._id)}
                    className={cn(
                      glassListItemClass,
                      isCurrentAssignee && "ring-1 ring-primary/40"
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                      {getStaffInitials(staffName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {staffName}
                      </span>
                      {staff.email ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {staff.email}
                        </span>
                      ) : null}
                    </span>
                    {isCurrentAssignee ? (
                      <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400">
                        Current
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeAssignModal}
              disabled={isAssigningLead}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isBulkStatusModalOpen}
        onOpenChange={setIsBulkStatusModalOpen}
      >
        <DialogContent className={cn("sm:max-w-md", glassModalClass)}>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              {singleSelectedLead
                ? `Update status for ${singleSelectedLead.name}.`
                : `Apply a new status to ${selectedLeads.length} selected leads.`}
            </DialogDescription>
          </DialogHeader>

          {selectedLeads.length === 1 && singleSelectedLead ? (
            <div className={cn(glassCurrentCardClass, "mb-1")}>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-muted-foreground">Current Status:</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border border-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm",
                    getStatusBadgeStyles(singleSelectedLead.status)
                  )}
                >
                  {getStatusLabel(singleSelectedLead.status)}
                </span>
              </div>
            </div>
          ) : null}

          <div className="space-y-2 py-2">
            <Label>Status</Label>
            <Select
              value={bulkStatus}
              onValueChange={(value) =>
                value && setBulkStatus(value as LeadStatus)
              }
            >
              <SelectTrigger className={cn("w-full", glassSelectClass)}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkStatusModalOpen(false)}
              disabled={isBulkStatusSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleBulkStatusSubmit()}
              disabled={isBulkStatusSubmitting}
            >
              {isBulkStatusSubmitting ? "Updating…" : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isBulkAssignModalOpen}
        onOpenChange={(open) => {
          setIsBulkAssignModalOpen(open);
          if (!open) {
            setBulkAssignStaffId("");
            setAssignStaffSearch("");
          }
        }}
      >
        <DialogContent className={cn("sm:max-w-md", glassModalClass)}>
          <DialogHeader>
            <DialogTitle>Assign to Staff</DialogTitle>
            <DialogDescription>
              {singleSelectedLead
                ? `Choose a staff member to assign ${singleSelectedLead.name}.`
                : `Assign ${selectedLeads.length} selected leads to a staff member.`}
            </DialogDescription>
          </DialogHeader>

          {selectedLeads.length === 1 && singleSelectedLead?.assignedTo ? (
            <div className={cn(glassCurrentCardClass, "mb-1")}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-sky-800 backdrop-blur-sm dark:border-white/10 dark:bg-white/10 dark:text-sky-200">
                  {getStaffInitials(
                    singleSelectedLead.assignedTo.name ||
                      `${singleSelectedLead.assignedTo.first_name ?? ""} ${singleSelectedLead.assignedTo.last_name ?? ""}`.trim() ||
                      singleSelectedLead.assignedToName ||
                      "Staff"
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {singleSelectedLead.assignedTo.name ||
                        `${singleSelectedLead.assignedTo.first_name ?? ""} ${singleSelectedLead.assignedTo.last_name ?? ""}`.trim() ||
                        singleSelectedLead.assignedToName ||
                        "Staff member"}
                    </p>
                    <span className={glassCurrentBadgeClass}>Current</span>
                  </div>
                  {currentAssigneeStaff?.email ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {currentAssigneeStaff.email}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {!isLoadingStaff && staffMembers.length > 0 ? (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={assignStaffSearch}
                onChange={(e) => setAssignStaffSearch(e.target.value)}
                placeholder="Search staff by name or email…"
                className={cn(glassInputClass, "rounded-lg")}
              />
            </div>
          ) : null}

          <div className="max-h-72 space-y-2 overflow-y-auto py-2">
            {isLoadingStaff ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading staff members…
              </p>
            ) : staffMembers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No active staff members found.
              </p>
            ) : filteredStaffMembers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No staff members match &ldquo;{assignStaffSearch.trim()}&rdquo;.
              </p>
            ) : (
              filteredStaffMembers.map((staff) => {
                const staffName = getStaffMemberName(staff);
                const isSelected = bulkAssignStaffId === staff._id;
                const isCurrentAssignee =
                  singleSelectedLead?.assignedTo?._id === staff._id;

                return (
                  <button
                    key={staff._id}
                    type="button"
                    disabled={isBulkAssignSubmitting}
                    onClick={() => setBulkAssignStaffId(staff._id)}
                    className={cn(
                      glassListItemClass,
                      isSelected && "ring-1 ring-primary/40 bg-primary/10"
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                      {getStaffInitials(staffName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {staffName}
                      </span>
                      {staff.email ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {staff.email}
                        </span>
                      ) : null}
                    </span>
                    {isCurrentAssignee ? (
                      <span className={glassCurrentBadgeClass}>Current</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkAssignModalOpen(false)}
              disabled={isBulkAssignSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleBulkAssignSubmit()}
              disabled={isBulkAssignSubmitting || !bulkAssignStaffId}
            >
              {isBulkAssignSubmitting ? "Assigning…" : "Assign Leads"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportLeadsModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={({ imported, skipped }) => {
          toast.success(
            `Imported ${imported} lead${imported === 1 ? "" : "s"}. Skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.`
          );
          void Promise.all([loadLeads(), loadStats()]);
        }}
      />

      <LeadDetailsModal
        open={isViewModalOpen}
        lead={selectedViewLead}
        leads={leads}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedViewLead(null);
        }}
        onSelectLead={(lead) => {
          setSelectedViewLead(lead);
        }}
        onWhatsApp={(lead) => openLeadWhatsApp(lead)}
        onDownloadQuote={(lead) => {
          void downloadQuotation(lead._id, lead.name);
        }}
        onScheduleFollowUp={
          canEditLeads
            ? (lead) => {
                openFollowUpModal(lead);
              }
            : undefined
        }
        onAssignLead={
          canManageUsers
            ? (lead) => {
                void openAssignModal(lead);
              }
            : undefined
        }
        onStatusChange={
          canEditLeads
            ? (lead, status) => {
                handleStatusChange(
                  lead._id,
                  status,
                  status === "Booked" ? lead : undefined
                );
              }
            : undefined
        }
        onEdit={(lead) => {
          // Close details portal first so the Edit Lead dialog can receive focus
          setIsViewModalOpen(false);
          setSelectedViewLead(null);
          window.setTimeout(() => {
            openEditDialog(lead);
          }, 80);
        }}
      />
    </>
  );
}
