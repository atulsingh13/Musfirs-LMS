import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import {
  Activity,
  Calendar,
  Check,
  ChevronLeft,
  ChevronUp,
  Copy,
  CreditCard,
  FileText,
  Globe,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plane,
  Plus,
  RefreshCw,
  StickyNote,
  Tag,
  User,
  UserPlus,
  X,
  CalendarDays,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import {
  addLeadNote,
  fetchLeadActivities,
  type LeadActivity,
  type LeadActivityType,
} from "@/services/lead-activity-api";
import {
  formatLeadDateLabel,
  LEAD_STATUS_OPTIONS,
  type ApiLead,
  type LeadStatus,
} from "@/services/lead-api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type DetailTab = "timeline" | "notes";

const STEPPER_STEPS = [
  { key: "new", label: "New Lead", icon: User },
  { key: "contacted", label: "Contacted", icon: Phone },
  { key: "qualified", label: "Qualified", icon: Check },
  { key: "plan", label: "Plan Shared", icon: Plane },
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "booked", label: "Booked", icon: CalendarDays },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
] as const;

function IconImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("size-4 object-contain", className)}
      draggable={false}
    />
  );
}

function stepperIndexForStatus(status: LeadStatus): number {
  switch (status) {
    case "New Lead":
      return 0;
    case "Qualification Pending":
    case "Follow-up Later":
      return 1;
    case "Qualified":
      return 2;
    case "Plan Shared":
      return 3;
    case "Hot / Payment Pending":
    case "Payment Pending":
    case "Advance Paid":
      return 4;
    case "Booked":
      return 5;
    case "Travel Completed":
      return 6;
    default:
      return 0;
  }
}

function formatLeadId(lead: ApiLead): string {
  const year = lead.createdAt
    ? new Date(lead.createdAt).getFullYear()
    : new Date().getFullYear();
  const suffix = lead._id.slice(-4).toUpperCase();
  return `LDD-${year}-${suffix}`;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatActivityTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "d MMM yyyy, hh:mm a");
}

function isSystemActor(activity: LeadActivity): boolean {
  const by = activity.performedBy;
  return !by || !by._id;
}

function resolveActorName(activity: LeadActivity): string {
  if (isSystemActor(activity)) return "Website Bot";
  const by = activity.performedBy;
  if (by?.name?.trim()) return by.name.trim();
  return `${by?.first_name ?? ""} ${by?.last_name ?? ""}`.trim() || "Website Bot";
}

function activityVisual(type: LeadActivityType): {
  icon: typeof StickyNote;
  tone: string;
  title: string;
} {
  switch (type) {
    case "Status_Changed":
      return {
        icon: RefreshCw,
        tone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
        title: "Status updated",
      };
    case "Note_Added":
      return {
        icon: StickyNote,
        tone: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300",
        title: "Note added",
      };
    case "Call_Scheduled":
      return {
        icon: Clock3,
        tone: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300",
        title: "Follow-up scheduled",
      };
    case "Call_Completed":
      return {
        icon: CheckCircle2,
        tone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
        title: "Phone call made",
      };
    case "Assigned":
      return {
        icon: UserPlus,
        tone: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
        title: "Lead assigned",
      };
    case "Lead_Created":
    default:
      return {
        icon: Plus,
        tone: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        title: "Lead created",
      };
  }
}

const scrollClass =
  "overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] dark:[scrollbar-color:#475569_transparent]";

function SectionHeader({
  iconSrc,
  title,
  action,
}: {
  iconSrc: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 border-b border-gray-100 pb-2 dark:border-white/10">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
          <IconImg src={iconSrc} alt="" className="size-4" />
        </span>
        <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h4>
      </div>
      {action}
    </div>
  );
}

/** Trip row: icon → label → value → optional trailing badge/image */
function TripDetailRow({
  iconSrc,
  label,
  value,
  trailing,
}: {
  iconSrc: string;
  label: string;
  value: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-gray-100 py-1.5 last:border-b-0 dark:border-white/10 sm:items-center">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-50 dark:bg-white/5">
        <IconImg
          src={iconSrc}
          alt=""
          className="size-4 dark:brightness-150"
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4 md:gap-9">
        <span className="w-auto shrink-0 text-[11px] text-gray-500 dark:text-gray-400 sm:w-[88px]">
          {label}
        </span>
        <span className="min-w-0 flex-1 text-xs font-semibold text-gray-900 dark:text-gray-100">
          {value}
        </span>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

function LeadProgressStepper({
  activeIndex,
  onClose,
}: {
  activeIndex: number;
  onClose: () => void;
}) {
  return (
    <div className="relative border-b border-gray-200 bg-white px-3 py-3 pr-10 dark:border-white/10 dark:bg-zinc-900 sm:px-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2.5 right-2.5 z-20 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
        aria-label="Close"
      >
        <X className="size-4" />
      </button>

      <p className="mb-2 text-[10px] font-medium text-gray-500 dark:text-gray-400 sm:hidden">
        Step {activeIndex + 1}/{STEPPER_STEPS.length} ·{" "}
        {STEPPER_STEPS[activeIndex]?.label}
      </p>

      <div className="-mx-1 flex items-start justify-between gap-0.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STEPPER_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;
          return (
            <div
              key={step.key}
              className="relative flex min-w-[2.75rem] flex-1 flex-col items-center text-center sm:min-w-0"
            >
              {index < STEPPER_STEPS.length - 1 ? (
                <div
                  className={cn(
                    "absolute top-3 left-[calc(50%+12px)] right-[calc(-50%+12px)] h-px",
                    index < activeIndex
                      ? "bg-emerald-500"
                      : "bg-gray-200 dark:bg-white/15"
                  )}
                />
              ) : null}
              <div
                className={cn(
                  "relative z-10 flex size-6 items-center justify-center rounded-full border",
                  isDone && "border-emerald-500 bg-emerald-500 text-white",
                  isActive && "border-violet-600 bg-violet-600 text-white",
                  !isDone &&
                    !isActive &&
                    "border-gray-300 bg-white text-gray-400 dark:border-white/20 dark:bg-zinc-800 dark:text-gray-500"
                )}
              >
                {isDone ? (
                  <Check className="size-3" strokeWidth={2.5} />
                ) : (
                  <Icon className="size-2.5" />
                )}
              </div>
              <p
                className={cn(
                  "mt-1 hidden text-[9px] leading-tight sm:block",
                  isActive
                    ? "font-semibold text-violet-700 dark:text-violet-300"
                    : isDone
                      ? "font-medium text-emerald-700 dark:text-emerald-300"
                      : "text-gray-400 dark:text-gray-500"
                )}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const menuItemClass =
  "flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10 dark:focus:bg-white/10";

export interface LeadDetailsModalProps {
  open: boolean;
  lead: ApiLead | null;
  leads?: ApiLead[];
  onClose: () => void;
  onEdit: (lead: ApiLead) => void;
  onWhatsApp: (lead: ApiLead) => void;
  onDownloadQuote: (lead: ApiLead) => void;
  onScheduleFollowUp?: (lead: ApiLead) => void;
  onAssignLead?: (lead: ApiLead) => void;
  onStatusChange?: (lead: ApiLead, status: LeadStatus) => void;
  onSelectLead?: (lead: ApiLead) => void;
}

export function LeadDetailsModal({
  open,
  lead,
  leads = [],
  onClose,
  onEdit,
  onWhatsApp,
  onDownloadQuote,
  onScheduleFollowUp,
  onAssignLead,
  onStatusChange,
  onSelectLead,
}: LeadDetailsModalProps) {
  const [tab, setTab] = useState<DetailTab>("timeline");
  const [note, setNote] = useState("");
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [isMobileMinimized, setIsMobileMinimized] = useState(true);

  const activeStep = lead ? stepperIndexForStatus(lead.status) : 0;

  const previousLead = useMemo(() => {
    if (!lead || leads.length === 0) return null;
    const index = leads.findIndex((item) => item._id === lead._id);
    if (index <= 0) return null;
    return leads[index - 1] ?? null;
  }, [lead, leads]);

  const noteCount = activities.filter((a) => a.actionType === "Note_Added").length;
  const filteredActivities = useMemo(() => {
    if (tab === "notes") {
      return activities.filter((a) => a.actionType === "Note_Added");
    }
    return activities;
  }, [activities, tab]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !lead?._id) return;
    let cancelled = false;
    setLoadingActivities(true);
    void fetchLeadActivities(lead._id)
      .then((rows) => {
        if (!cancelled) setActivities(rows);
      })
      .catch(() => {
        if (!cancelled) setActivities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingActivities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lead?._id]);

  useEffect(() => {
    if (!open) {
      setNote("");
      setTab("timeline");
    }
    // Always start minimized when the modal opens (or resets on close)
    setIsMobileMinimized(true);
  }, [open]);

  async function handleAddNote() {
    if (!lead || !note.trim() || submittingNote) return;
    setSubmittingNote(true);
    try {
      const created = await addLeadNote(lead._id, note.trim());
      setActivities((prev) => [created, ...prev]);
      setNote("");
      toast.success("Note added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  }

  async function copyContact() {
    if (!lead) return;
    const text = [lead.contactNumber, lead.email, lead.city]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Contact details copied.");
    } catch {
      toast.error("Unable to copy contact details.");
    }
  }

  if (!open || !lead) return null;

  const source = lead.source || lead.leadSource || "Other";
  const pax = lead.numberOfPax || lead.pax || 0;

  const modal = (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none bg-white text-[13px] text-gray-900 shadow-2xl sm:h-[90vh] sm:w-[95vw] sm:rounded-2xl md:flex-row dark:bg-zinc-900 dark:text-gray-100">
        {/* Left */}
        <aside
          className={cn(
            "relative flex w-full shrink-0 flex-col gap-3 border-b border-gray-200 bg-white p-3 md:max-h-none md:w-[38%] md:border-r md:border-b-0 lg:w-[32%] dark:border-white/10 dark:bg-zinc-900",
            isMobileMinimized
              ? "min-h-0 flex-1 max-md:max-h-none max-md:pb-16"
              : "max-md:max-h-[48vh]",
            scrollClass
          )}
        >
          {/* Mobile-only: exit entire modal (independent of activity minimize) */}
          <div className="flex items-center justify-between gap-2 md:hidden">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-gray-100"
              aria-label="Close lead details"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-gray-100"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>
          </div>

          <div>
            <h2
              id="lead-details-title"
              className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-50"
            >
              Lead Details
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Complete information and activity history.
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-base font-bold capitalize text-gray-900 dark:text-gray-50">
                {lead.name}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                <Plane className="size-2.5" />
                {lead.status}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              {lead.age} yrs · {lead.gender}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              Lead ID: {formatLeadId(lead)}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onWhatsApp(lead)}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-600"
              >
                <IconImg
                  src="/assets/icons/whatsapp.svg"
                  alt=""
                  className="size-3.5 brightness-0 invert"
                />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => onDownloadQuote(lead)}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <FileText className="size-3.5" />
                Download Quote
              </button>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md border border-gray-200 p-1.5 hover:bg-gray-50 dark:border-white/15 dark:hover:bg-white/10"
                    aria-label="More actions"
                  >
                    <IconImg
                      src="/assets/icons/menu-dots.svg"
                      alt="More"
                      className="size-3.5 dark:brightness-200"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[110] w-52 p-1">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Actions
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      className={menuItemClass}
                      onClick={() => onEdit(lead)}
                    >
                      <Pencil className="size-4 shrink-0" />
                      Edit Lead
                    </DropdownMenuItem>
                    {onScheduleFollowUp ? (
                      <DropdownMenuItem
                        className={menuItemClass}
                        onClick={() => onScheduleFollowUp(lead)}
                      >
                        <Calendar className="size-4 shrink-0" />
                        Schedule Follow-up
                      </DropdownMenuItem>
                    ) : null}
                    {onAssignLead ? (
                      <DropdownMenuItem
                        className={menuItemClass}
                        onClick={() => onAssignLead(lead)}
                      >
                        <UserPlus className="size-4 shrink-0" />
                        Assign Lead
                      </DropdownMenuItem>
                    ) : null}
                    {onStatusChange ? (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger
                          className={cn(menuItemClass, "w-full")}
                        >
                          <Tag className="size-4 shrink-0" />
                          <span className="flex-1 text-left">Update Status</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="z-[120] max-h-72 overflow-y-auto">
                            {LEAD_STATUS_OPTIONS.map((option) => (
                              <DropdownMenuItem
                                key={option}
                                disabled={lead.status === option}
                                className={cn(
                                  menuItemClass,
                                  (option === "Booked" ||
                                    option === "Travel Completed") &&
                                    "font-medium text-green-600 dark:text-green-400",
                                  (option === "Not Interested" ||
                                    option === "Not Qualified") &&
                                    "text-red-600 dark:text-red-400"
                                )}
                                onClick={() => onStatusChange(lead, option)}
                              >
                                {option}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    ) : null}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Contact */}
          <section className="rounded-lg border border-gray-200 p-2.5 shadow-sm dark:border-white/10 dark:bg-zinc-950/40">
            <SectionHeader
              iconSrc="/assets/icons/contact-user.svg"
              title="Contact Information"
              action={
                <button
                  type="button"
                  onClick={() => void copyContact()}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Copy className="size-3" />
                  Copy
                </button>
              }
            />
            <div className="space-y-1">
              {lead.contactNumber ? (
                <a
                  href={`tel:${lead.contactNumber.replace(/\s+/g, "")}`}
                  aria-label={`Call ${lead.contactNumber}`}
                  className="flex items-center gap-2 rounded-md py-1 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <IconImg src="/assets/icons/phone-call.svg" alt="" />
                  <span className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                    {lead.contactNumber}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-2 py-1 opacity-50">
                  <IconImg src="/assets/icons/phone-call.svg" alt="" />
                  <span className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                    —
                  </span>
                </div>
              )}
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  aria-label={`Email ${lead.email}`}
                  className="flex items-center gap-2 rounded-md py-1 transition-colors hover:bg-sky-50 dark:hover:bg-sky-950/40"
                >
                  <IconImg src="/assets/icons/email.svg" alt="" />
                  <span className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                    {lead.email}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-2 py-1 opacity-50">
                  <IconImg src="/assets/icons/email.svg" alt="" />
                  <span className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                    —
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 py-1">
                <MapPin className="size-4 shrink-0 text-rose-500" />
                <span className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                  {lead.city || "—"}
                </span>
              </div>
            </div>
          </section>

          {/* Trip */}
          <section className="rounded-lg border border-gray-200 p-2.5 shadow-sm dark:border-white/10 dark:bg-zinc-950/40">
            <SectionHeader
              iconSrc="/assets/icons/suitcase.svg"
              title="Trip Details"
            />
            <div>
              <TripDetailRow
                iconSrc="/assets/icons/trip-mountain.svg"
                label="Destination :"
                value={lead.destination || "—"}
              />
              <TripDetailRow
                iconSrc="/assets/icons/trip-calendar.svg"
                label="Date of Travel :"
                value={formatLeadDateLabel(lead.dateOfTravel)}
              />
              <TripDetailRow
                iconSrc="/assets/icons/trip-users.svg"
                label="Number of Pax :"
                value={pax > 0 ? `${pax} Adults` : "—"}
              />
            </div>
          </section>

          {/* Source */}
          <section className="rounded-lg border border-gray-200 p-2.5 shadow-sm dark:border-white/10 dark:bg-zinc-950/40">
            <SectionHeader
              iconSrc="/assets/icons/megaphone.svg"
              title="Source & Campaign"
            />
            <div>
              <TripDetailRow
                iconSrc="/assets/icons/source-globe.svg"
                label="Lead Source :"
                value={source}
              />
              <TripDetailRow
                iconSrc="/assets/icons/campaign-megaphone.svg"
                label="Campaign :"
                value={lead.campaign || "N/A"}
              />
              {lead.nextFollowUp ? (
                <TripDetailRow
                  iconSrc="/assets/icons/followup-clock.svg"
                  label="Next Follow-up :"
                  value={formatActivityTime(lead.nextFollowUp)}
                />
              ) : null}
            </div>
          </section>
        </aside>

        {/* The purple trigger bar — only in the DOM when timeline is minimized */}
        {isMobileMinimized ? (
          <div
            role="button"
            tabIndex={0}
            className="fixed inset-x-0 bottom-0 z-50 flex h-14 cursor-pointer items-center justify-between rounded-t-2xl bg-violet-600 px-5 text-white shadow-[0_-4px_10px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out md:hidden"
            onClick={() => setIsMobileMinimized(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsMobileMinimized(false);
              }
            }}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Activity className="size-4" />
              View Activity & Notes
            </span>
            <ChevronUp className="size-5 animate-bounce" />
          </div>
        ) : null}

        {/* Right — activity / notes */}
        <section
          className={cn(
            "flex min-h-0 w-full flex-col bg-slate-50/50 transition-transform duration-300 ease-in-out dark:bg-zinc-950/50 md:relative md:w-[62%] md:translate-y-0 md:shadow-none md:transition-none",
            // Mobile bottom-sheet: anchored to screen bottom (no gap under sheet when expanded)
            "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:h-[85vh] max-md:max-h-[100dvh] max-md:overflow-hidden max-md:rounded-t-2xl max-md:bg-white max-md:pb-0 max-md:shadow-2xl max-md:dark:bg-zinc-900",
            "max-md:transform-gpu max-md:will-change-transform max-md:ease-in-out max-md:motion-reduce:transition-none",
            isMobileMinimized ? "max-md:translate-y-full" : "max-md:translate-y-0"
          )}
        >
          <LeadProgressStepper
            activeIndex={activeStep}
            onClose={() => {
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                setIsMobileMinimized(true);
              } else {
                onClose();
              }
            }}
          />

          <div className="mx-3 mt-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this lead..."
              rows={2}
              className="w-full resize-none border-0 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <div className="mt-1.5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={!note.trim() || submittingNote}
                onClick={() => void handleAddNote()}
                className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {submittingNote ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : null}
                Add Note
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 pt-2 dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center gap-3 overflow-x-auto">
              {(
                [
                  { id: "timeline", label: "Activity Timeline" },
                  { id: "notes", label: `Notes (${noteCount})` },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "whitespace-nowrap pb-2 text-[11px] transition-colors",
                    tab === item.id
                      ? "-mb-px border-b-2 border-violet-600 font-medium text-violet-600 dark:border-violet-400 dark:text-violet-300"
                      : "border-b-2 border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={cn("relative min-h-0 flex-1 p-3", scrollClass)}>
            {loadingActivities ? (
              <div className="flex h-24 items-center justify-center text-gray-400">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                No activities yet.
              </div>
            ) : (
              <div className="relative">
                <div className="absolute top-2 bottom-2 left-7 w-px bg-gray-200 dark:bg-white/10" />
                <ul>
                  {filteredActivities.map((activity, index) => {
                    const visual = activityVisual(activity.actionType);
                    const Icon = visual.icon;
                    const isSystem = isSystemActor(activity);
                    const actorName = resolveActorName(activity);
                    const isCurrentStage =
                      activity.actionType === "Status_Changed" &&
                      activity.details
                        .toLowerCase()
                        .includes(lead.status.toLowerCase());
                    return (
                      <li key={activity.id || activity._id} className="relative">
                        <span
                          className={cn(
                            "absolute top-2 left-7 z-10 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-slate-50 dark:border-zinc-950",
                            visual.tone
                          )}
                        >
                          <Icon className="size-3" />
                        </span>
                        <div className="ml-11 mb-3 rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                              {visual.title}
                            </h5>
                            <time className="shrink-0 text-[10px] text-gray-400">
                              {formatActivityTime(activity.createdAt)}
                            </time>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-gray-600 dark:text-gray-300">
                            {activity.details}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {index === 0 && isCurrentStage ? (
                              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                                Current Stage
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-1.5 py-1 text-[10px] text-gray-700 dark:text-gray-300">
                            <span
                              className={cn(
                                "flex size-4 items-center justify-center rounded-full text-[8px] font-bold",
                                isSystem
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : "bg-violet-200 text-violet-800 dark:bg-violet-900 dark:text-violet-200"
                              )}
                            >
                              {isSystem ? (
                                <Globe className="size-2.5" />
                              ) : (
                                initialsFromName(actorName)
                              )}
                            </span>
                            By: {actorName}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-zinc-900">
            <button
              type="button"
              disabled={!previousLead}
              onClick={() => previousLead && onSelectLead?.(previousLead)}
              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ChevronLeft className="size-3.5" />
              Previous Lead
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
