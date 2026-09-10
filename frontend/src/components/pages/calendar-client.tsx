import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type WheelEvent as ReactWheelEvent } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { addDays, addMonths, isSameDay, startOfWeek, subMonths } from "date-fns";
import { toast } from "sonner";
import { CalendarSkeleton } from "@/components/skeletons";
import {
  createCalendarEvent,
  createCalendarTask,
  completeCalendarTask,
  datetimeDefaultsForDate,
  defaultMeetingEnd,
  defaultMeetingStart,
  deleteCalendarEvent,
  eventOccursOnDate,
  formatEventDateTimeRange,
  getCalendarErrorMessage,
  getCalendarEvents,
  getEventColor,
  getEventColorDot,
  getEventDescription,
  getEventMeetingLink,
  getEventParticipants,
  getFollowUpContactNumber,
  getFollowUpEmail,
  getFollowUpLeadId,
  isCalendarMeeting,
  isCalendarTask,
  isCalendarFollowUp,
  isFollowUpCompleted,
  isSameCalendarDay,
  isTaskCompleted,
  toWhatsAppNumber,
  MEETING_TYPE_OPTIONS,
  DEFAULT_MEETING_TYPE,
  toDatetimeLocalValue,
  updateCalendarEvent,
  type ApiCalendarEvent,
  type MeetingType,
} from "@/services/calendar-api";
import {
  getLeadErrorMessage,
  markLeadFollowUpDone,
} from "@/services/lead-api";
import { getAllUsers, getUsersErrorMessage } from "@/services/users-api";
import type { ApiUserRef } from "@/services/users-api";
import { RequirePermission } from "@/components/auth/require-permission";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"] as const;
const POPUP_WIDTH = 350;
const POPUP_HEIGHT_ESTIMATE = 400;

type CalendarView = "month" | "week";
type CreateEntryMode = "event" | "task";

type ClickPosition = { clientX: number; clientY: number };

function calculatePopupStyle(clientX: number, clientY: number): CSSProperties {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 800;
  const width = Math.min(POPUP_WIDTH, viewportWidth - 24);
  const isMobile = viewportWidth < 768;

  if (isMobile) {
    return {
      position: "fixed",
      left: 12,
      right: 12,
      width: "auto",
      maxWidth: viewportWidth - 24,
      top: "50%",
      transform: "translateY(-50%)",
      maxHeight: "min(80dvh, 520px)",
      overflowY: "auto",
      zIndex: 50,
    };
  }

  const style: CSSProperties = {
    position: "fixed",
    width,
    maxWidth: "calc(100vw - 1.5rem)",
    zIndex: 50,
  };

  if (clientX - width < 0) {
    style.left = Math.min(clientX + 20, viewportWidth - width - 12);
  } else {
    style.left = Math.max(12, clientX - width - 20);
  }

  if (clientY + POPUP_HEIGHT_ESTIMATE > viewportHeight) {
    style.bottom = Math.max(12, viewportHeight - clientY + 20);
  } else {
    style.top = Math.max(12, clientY - 20);
  }

  return style;
}

const QUICK_ACTION_ICON_CLASS =
  "h-5 w-5 opacity-80 transition-transform duration-200 hover:scale-110 hover:opacity-100";

function FollowUpContactActions({ event }: { event: ApiCalendarEvent }) {
  const contactNumber = getFollowUpContactNumber(event);
  const email = getFollowUpEmail(event);
  const whatsAppNumber = toWhatsAppNumber(contactNumber);

  if (!contactNumber && !email) return null;

  return (
    <div className="mt-4 flex flex-row gap-4">
      {contactNumber ? (
        <>
          <a
            href={`tel:${contactNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Call lead"
            className="inline-flex"
          >
            <img
              src="/assets/icons/phone-call.svg"
              alt=""
              className={QUICK_ACTION_ICON_CLASS}
            />
          </a>
          {whatsAppNumber ? (
            <a
              href={`https://wa.me/${whatsAppNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp lead"
              className="inline-flex"
            >
              <img
                src="/assets/icons/whatsapp.svg"
                alt=""
                className={QUICK_ACTION_ICON_CLASS}
              />
            </a>
          ) : null}
        </>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Email lead"
          className="inline-flex"
        >
          <img
            src="/assets/icons/email.svg"
            alt=""
            className={QUICK_ACTION_ICON_CLASS}
          />
        </a>
      ) : null}
    </div>
  );
}

function FollowUpDetailsButton({
  event,
  onNavigate,
}: {
  event: ApiCalendarEvent;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const leadId = getFollowUpLeadId(event);

  if (!leadId) return null;

  function openLeadDetails() {
    onNavigate?.();
    navigate(`/leads?view=${encodeURIComponent(leadId)}`);
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="glass-control shrink-0 px-3 hover:bg-white/40 dark:hover:bg-white/15"
      onClick={openLeadDetails}
    >
      Details
    </Button>
  );
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const weeksNeeded = Math.ceil((firstDay + daysInMonth) / 7);
  const totalCells = weeksNeeded * 7;

  const cells: { day: number; inMonth: boolean; date: Date }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({
      day,
      inMonth: false,
      date: new Date(year, month - 1, day),
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      inMonth: true,
      date: new Date(year, month, day),
    });
  }

  const trailing = totalCells - cells.length;
  for (let day = 1; day <= trailing; day++) {
    cells.push({
      day,
      inMonth: false,
      date: new Date(year, month + 1, day),
    });
  }

  return cells;
}

export function CalendarClient() {
  const { canCreate, canEdit, canDelete, canView } = usePermissions();
  const canCreateCalendar = canCreate("Calendar");
  const canEditCalendar = canEdit("Calendar");
  const canDeleteCalendar = canDelete("Calendar");
  const canEditLeads = canEdit("Leads");
  const canViewUsers = canView("Users");
  const today = useMemo(() => new Date(), []);
  const [events, setEvents] = useState<ApiCalendarEvent[]>([]);
  const [users, setUsers] = useState<ApiUserRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<ApiCalendarEvent | null>(null);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({});
  const [clickPosition, setClickPosition] = useState<ClickPosition | null>(null);
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [slideDirection, setSlideDirection] = useState(1);
  const lastScrollTime = useRef(0);
  const scrollCooldown = 800;
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<MeetingType>(DEFAULT_MEETING_TYPE);
  const [startTime, setStartTime] = useState(() => defaultMeetingStart());
  const [endTime, setEndTime] = useState(() => defaultMeetingEnd());
  const [meetingLink, setMeetingLink] = useState("");
  const [description, setDescription] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [entryMode, setEntryMode] = useState<CreateEntryMode>("event");
  const [taskDeadline, setTaskDeadline] = useState(() => defaultMeetingStart());
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completingFollowUpId, setCompletingFollowUpId] = useState<string | null>(
    null
  );
  const loadEvents = useCallback(async () => {
    try {
      const response = await getCalendarEvents();
      setEvents(response.data?.events ?? []);
    } catch (error) {
      toast.error(
        getCalendarErrorMessage(error, "Failed to load calendar events.")
      );
      setEvents([]);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (!canViewUsers) {
      setUsers([]);
      return;
    }
    try {
      const response = await getAllUsers();
      setUsers(response.data.users);
    } catch (error) {
      toast.error(getUsersErrorMessage(error, "Failed to load users."));
      setUsers([]);
    }
  }, [canViewUsers]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const tasks: Promise<void>[] = [loadEvents()];
      if (canViewUsers) {
        tasks.push(loadUsers());
      }
      await Promise.all(tasks);
      setIsLoading(false);
    }
    void init();
  }, [loadEvents, loadUsers, canViewUsers]);

  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(currentDate);

  const grid = useMemo(
    () => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const weekCount = grid.length / 7;

  const weekDates = useMemo(() => {
    const anchor = new Date(currentDate);
    if (
      today.getFullYear() === currentDate.getFullYear() &&
      today.getMonth() === currentDate.getMonth()
    ) {
      anchor.setDate(today.getDate());
    }
    const weekStart = startOfWeek(anchor, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [currentDate, today]);

  const eventsForDate = useCallback(
    (date: Date) => events.filter((event) => eventOccursOnDate(event, date)),
    [events]
  );

  const goToday = () => {
    setCurrentDate(new Date());
    setSlideDirection(0);
  };

  const navigateMonth = useCallback((direction: 1 | -1) => {
    setSlideDirection(direction);
    setCurrentDate((date) =>
      direction === 1 ? addMonths(date, 1) : subMonths(date, 1)
    );
  }, []);

  const prevMonth = () => navigateMonth(-1);
  const nextMonth = () => navigateMonth(1);

  const handleWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0) return;

    const now = Date.now();
    if (now - lastScrollTime.current < scrollCooldown) {
      return;
    }

    if (e.deltaY > 0) {
      navigateMonth(1);
      lastScrollTime.current = now;
    } else if (e.deltaY < 0) {
      navigateMonth(-1);
      lastScrollTime.current = now;
    }
  }, [navigateMonth]);

  useEffect(() => {
    if (isLoading) return;

    const el = calendarContainerRef.current;
    if (!el) return;

    const preventPageScroll = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", preventPageScroll, { passive: false });
    return () => el.removeEventListener("wheel", preventPageScroll);
  }, [isLoading]);

  const calendarMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

  const isToday = (date: Date) => isSameDay(date, today);

  function closeDetailPopover() {
    setDetailEvent(null);
    setClickPosition(null);
    setPopupStyle({});
  }

  function handleSelectEvent(event: ApiCalendarEvent, e: MouseEvent) {
    e.stopPropagation();
    const { clientX, clientY } = e;
    setDetailEvent(event);
    setClickPosition({ clientX, clientY });
    setPopupStyle(calculatePopupStyle(clientX, clientY));
  }

  function resetForm() {
    const start = defaultMeetingStart();
    setEditingEventId(null);
    setEntryMode("event");
    setTitle("");
    setEventType(DEFAULT_MEETING_TYPE);
    setStartTime(start);
    setEndTime(defaultMeetingEnd(start));
    setTaskDeadline(start);
    setMeetingLink("");
    setDescription("");
    setParticipantIds([]);
  }

  function openCreateForDate(date: Date) {
    if (!canCreateCalendar) return;

    const defaults = datetimeDefaultsForDate(date);
    setEditingEventId(null);
    setEntryMode("event");
    setTitle("");
    setEventType(DEFAULT_MEETING_TYPE);
    setStartTime(defaults.start);
    setEndTime(defaults.end);
    setTaskDeadline(defaults.start);
    setMeetingLink("");
    setDescription("");
    setParticipantIds([]);
    closeDetailPopover();
    setDialogOpen(true);
  }

  function openEditForEvent(event: ApiCalendarEvent) {
    if (!canEditCalendar) return;
    if (!isCalendarMeeting(event)) return;

    const raw = event.rawData;
    setEditingEventId(event.id);
    setEntryMode("event");
    setTitle(event.title);
    setEventType(
      (typeof raw.type === "string"
        ? raw.type
        : DEFAULT_MEETING_TYPE) as MeetingType
    );
    setStartTime(toDatetimeLocalValue(new Date(event.startDate)));
    setEndTime(toDatetimeLocalValue(new Date(event.endDate)));
    setMeetingLink(
      typeof raw.meetingLink === "string" ? raw.meetingLink : ""
    );
    setDescription(
      typeof raw.description === "string" ? raw.description : ""
    );

    const ids = Array.isArray(raw.participants)
      ? raw.participants.map((participant) => {
          if (
            typeof participant === "object" &&
            participant !== null &&
            "_id" in participant
          ) {
            return String((participant as { _id: string })._id);
          }
          return String(participant);
        })
      : [];

    setParticipantIds(ids);
    closeDetailPopover();
    setDialogOpen(true);
  }

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    if (!endTime || new Date(endTime) <= new Date(value)) {
      setEndTime(defaultMeetingEnd(value));
    }
  }

  function toggleParticipant(userId: string) {
    setParticipantIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();

    if (editingEventId ? !canEditCalendar : !canCreateCalendar) {
      toast.error("You do not have permission to save this event.");
      return;
    }

    if (!title.trim() || !startTime || !endTime) {
      toast.error("Please fill in title, start time, and end time.");
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      toast.error("End time must be after start time.");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      participants: participantIds,
      meetingLink: meetingLink.trim() || undefined,
      type: eventType,
    };

    setIsSubmitting(true);
    try {
      if (editingEventId) {
        await updateCalendarEvent(editingEventId, payload);
        toast.success("Event updated successfully.");
      } else {
        await createCalendarEvent(payload);
        toast.success("Event scheduled successfully.");
      }

      setDialogOpen(false);
      resetForm();
      await loadEvents();
    } catch (error) {
      toast.error(
        getCalendarErrorMessage(
          error,
          editingEventId
            ? "Failed to update event."
            : "Failed to schedule event."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();

    if (!canCreateCalendar) {
      toast.error("You do not have permission to create tasks.");
      return;
    }

    if (!title.trim() || !taskDeadline) {
      toast.error("Please fill in title and deadline.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCalendarTask({
        title: title.trim(),
        deadline: new Date(taskDeadline).toISOString(),
        description: description.trim() || undefined,
      });
      toast.success("Task saved successfully.");
      setDialogOpen(false);
      resetForm();
      await loadEvents();
    } catch (error) {
      toast.error(getCalendarErrorMessage(error, "Failed to save task."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleTaskComplete(
    event: ApiCalendarEvent,
    e: MouseEvent
  ) {
    e.stopPropagation();
    if (!canEditCalendar) return;
    if (!isCalendarTask(event) || completingTaskId === event.id) return;

    const previousCompleted = isTaskCompleted(event);
    const nextCompleted = !previousCompleted;

    setEvents((prev) =>
      prev.map((item) =>
        item.id === event.id
          ? {
              ...item,
              isCompleted: nextCompleted,
              status: nextCompleted ? "Completed" : "Open",
              rawData: { ...item.rawData, isCompleted: nextCompleted },
            }
          : item
      )
    );
    setDetailEvent((prev) =>
      prev?.id === event.id
        ? {
            ...prev,
            isCompleted: nextCompleted,
            status: nextCompleted ? "Completed" : "Open",
            rawData: { ...prev.rawData, isCompleted: nextCompleted },
          }
        : prev
    );

    setCompletingTaskId(event.id);
    try {
      await completeCalendarTask(event.id);
    } catch (error) {
      setEvents((prev) =>
        prev.map((item) =>
          item.id === event.id
            ? {
                ...item,
                isCompleted: previousCompleted,
                status: previousCompleted ? "Completed" : "Open",
                rawData: { ...item.rawData, isCompleted: previousCompleted },
              }
            : item
        )
      );
      setDetailEvent((prev) =>
        prev?.id === event.id
          ? {
              ...prev,
              isCompleted: previousCompleted,
              status: previousCompleted ? "Completed" : "Open",
              rawData: { ...prev.rawData, isCompleted: previousCompleted },
            }
          : prev
      );
      toast.error(
        getCalendarErrorMessage(error, "Failed to update task status.")
      );
    } finally {
      setCompletingTaskId(null);
    }
  }

  async function handleMarkFollowUpDone(
    event: ApiCalendarEvent,
    e?: MouseEvent
  ) {
    e?.stopPropagation();
    if (
      !isCalendarFollowUp(event) ||
      isFollowUpCompleted(event) ||
      completingFollowUpId === event.id
    ) {
      return;
    }

    const leadId = getFollowUpLeadId(event);
    if (!leadId) {
      toast.error("Lead not found for this follow-up.");
      return;
    }

    const applyCompleted = (completed: boolean) => {
      setEvents((prev) =>
        prev.map((item) =>
          item.id === event.id
            ? {
                ...item,
                isCompleted: completed,
                rawData: {
                  ...item.rawData,
                  isFollowUpCompleted: completed,
                },
              }
            : item
        )
      );
      setDetailEvent((prev) =>
        prev?.id === event.id
          ? {
              ...prev,
              isCompleted: completed,
              rawData: {
                ...prev.rawData,
                isFollowUpCompleted: completed,
              },
            }
          : prev
      );
    };

    applyCompleted(true);
    setCompletingFollowUpId(event.id);
    try {
      await markLeadFollowUpDone(leadId);
      toast.success("Follow-up marked as done.");
    } catch (error) {
      applyCompleted(false);
      toast.error(
        getLeadErrorMessage(error, "Failed to mark follow-up as done.")
      );
    } finally {
      setCompletingFollowUpId(null);
    }
  }

  async function handleDeleteEvent(event: ApiCalendarEvent) {
    if (!canDeleteCalendar) return;
    if (!isCalendarMeeting(event)) return;

    setIsDeleting(true);
    try {
      await deleteCalendarEvent(event.id);
      toast.success("Event deleted successfully.");
      closeDetailPopover();
      await loadEvents();
    } catch (error) {
      toast.error(getCalendarErrorMessage(error, "Failed to delete event."));
    } finally {
      setIsDeleting(false);
    }
  }

  function renderEventPill(
    ev: ApiCalendarEvent,
    cellDate: Date,
    keySuffix: string
  ) {
    const start = new Date(ev.startDate);
    const end = new Date(ev.endDate);
    const isStart = isSameCalendarDay(cellDate, start);
    const isEnd = isSameCalendarDay(cellDate, end);
    const isSpan = !isSameCalendarDay(start, end);

    if (isCalendarTask(ev)) {
      const completed = isTaskCompleted(ev);
      return (
        <div
          key={`${ev.id}-${keySuffix}`}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md border-l-2 border-sky-500 bg-sky-100/90 px-1.5 py-0.5 text-left text-[10px] text-sky-950 sm:text-xs dark:bg-sky-500/25 dark:text-sky-100",
            completed && "opacity-70"
          )}
          title={ev.title}
        >
          <button
            type="button"
            aria-label={completed ? "Mark task incomplete" : "Mark task complete"}
            disabled={!canEditCalendar || completingTaskId === ev.id}
            className={cn(
              "flex size-3.5 shrink-0 items-center justify-center rounded-full border border-sky-600 bg-white transition-colors",
              completed && "border-sky-700 bg-sky-600 text-white",
              !canEditCalendar && "cursor-default opacity-60"
            )}
            onClick={(e) => void handleToggleTaskComplete(ev, e)}
          >
            {completed ? <Check className="size-2.5 stroke-[3]" /> : null}
          </button>
          <button
            type="button"
            className={cn(
              "min-w-0 flex-1 truncate text-left font-medium",
              completed && "line-through text-sky-800/70 dark:text-sky-200/70"
            )}
            onClick={(e) => handleSelectEvent(ev, e)}
          >
            {ev.title || "(No title)"}
          </button>
        </div>
      );
    }

    return (
      <button
        key={`${ev.id}-${keySuffix}`}
        type="button"
        className={cn(
          "block w-full truncate border-0 px-1.5 py-0.5 text-left text-[10px] font-medium sm:text-xs",
          getEventColor(ev),
          isCalendarFollowUp(ev) && "rounded-md",
          isSpan && !isStart && "rounded-none",
          isSpan && isStart && "rounded-l-md",
          isSpan && isEnd && "rounded-r-md",
          !isSpan && "rounded-md"
        )}
        title={ev.title}
        onClick={(e) => handleSelectEvent(ev, e)}
      >
        {(isStart || !isSpan) && ev.title}
      </button>
    );
  }
  const slideFromX =
    clickPosition && typeof popupStyle.left === "number"
      ? popupStyle.left > clickPosition.clientX
        ? -15
        : 15
      : 0;

  return (
    <>
      {isLoading ? (
        <CalendarSkeleton />
      ) : (
      <div className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{monthLabel}</h3>
              <p className="text-xs text-muted-foreground">
                {view === "month" ? "Monthly view" : "Weekly view"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border">
              <Button variant="ghost" size="icon-xs" onClick={prevMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToday}>
                Today
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={nextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="flex rounded-lg border p-0.5">
              <Button
                variant={view === "month" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("month")}
              >
                Month
              </Button>
              <Button
                variant={view === "week" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("week")}
              >
                Week
              </Button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div
          ref={calendarContainerRef}
          onWheel={handleWheel}
          className="relative min-h-0 flex-1 overscroll-contain overflow-y-auto p-2 touch-pan-y sm:p-4 md:touch-none md:overflow-hidden"
        >
            <div className="h-full w-full overflow-x-auto md:overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={calendarMonthKey}
                  initial={{ opacity: 0, y: slideDirection * 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: slideDirection * -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="h-full w-full min-w-[320px] md:min-w-0"
                >
                  {view === "month" ? (
                    <div className="flex min-h-[calc(100vh-280px)] flex-1 flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-md dark:border-white/10 dark:bg-white/5 sm:p-3">
                      <div className="mb-2 grid shrink-0 grid-cols-7 gap-1.5 sm:gap-2">
                        {WEEKDAYS.map((day, i) => (
                          <div
                            key={day}
                            className="rounded-lg px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-2 sm:text-xs"
                          >
                            <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
                            <span className="hidden sm:inline">{day}</span>
                          </div>
                        ))}
                      </div>
                      <div
                        className="grid min-h-0 flex-1 grid-cols-7 gap-1.5 sm:gap-2"
                        style={{
                          gridTemplateRows: `repeat(${weekCount}, minmax(72px, 1fr))`,
                        }}
                      >
                        {grid.map((cell, idx) => {
                          const dayEvents = cell.inMonth
                            ? eventsForDate(cell.date)
                            : [];
                          const todayCell = cell.inMonth && isToday(cell.date);
                          return (
                            <div
                              key={`${cell.date.toISOString()}-${idx}`}
                              role="button"
                              tabIndex={0}
                              className={cn(
                                "flex min-h-[72px] flex-col rounded-xl border border-white/30 bg-white/45 p-1 shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md transition-colors sm:min-h-[100px] sm:rounded-2xl sm:p-1.5 md:min-h-[120px] md:p-2 dark:border-white/10 dark:bg-white/10 dark:shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
                                canCreateCalendar
                                  ? "cursor-pointer hover:bg-white/60 dark:hover:bg-white/15"
                                  : "cursor-default",
                                !cell.inMonth &&
                                  "border-white/15 bg-white/20 text-muted-foreground dark:border-white/5 dark:bg-white/5"
                              )}
                              onClick={() => {
                                if (cell.inMonth) openCreateForDate(cell.date);
                              }}
                              onKeyDown={(e) => {
                                if (
                                  (e.key === "Enter" || e.key === " ") &&
                                  cell.inMonth &&
                                  canCreateCalendar
                                ) {
                                  e.preventDefault();
                                  openCreateForDate(cell.date);
                                }
                              }}
                            >
                              <span
                                className={cn(
                                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs sm:size-7 sm:text-sm",
                                  todayCell &&
                                    "bg-primary font-semibold text-primary-foreground"
                                )}
                              >
                                {cell.day}
                              </span>
                              <div className="mt-0.5 min-h-0 flex-1 space-y-0.5 overflow-hidden sm:mt-1 sm:space-y-1">
                                {dayEvents.slice(0, 3).map((ev) =>
                                  renderEventPill(
                                    ev,
                                    cell.date,
                                    cell.date.toISOString()
                                  )
                                )}
                                {dayEvents.length > 3 ? (
                                  <p className="px-0.5 text-[9px] text-muted-foreground sm:text-[10px]">
                                    +{dayEvents.length - 3} more
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-md dark:border-white/10 dark:bg-white/5 sm:p-3">
                      <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
                        {weekDates.map((date) => {
                          const todayCell = isToday(date);
                          return (
                            <div
                              key={date.toISOString()}
                              className="rounded-lg px-1 py-2 text-center sm:px-2 sm:py-3"
                            >
                              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                                <span className="sm:hidden">
                                  {WEEKDAYS_SHORT[date.getDay()]}
                                </span>
                                <span className="hidden sm:inline">
                                  {WEEKDAYS[date.getDay()]}
                                </span>
                              </p>
                              <p
                                className={cn(
                                  "mx-auto mt-1 flex size-7 items-center justify-center rounded-full text-xs font-semibold sm:size-8 sm:text-sm",
                                  todayCell && "bg-primary text-primary-foreground"
                                )}
                              >
                                {date.getDate()}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid min-h-[280px] grid-cols-7 gap-1.5 sm:min-h-[400px] sm:gap-2">
                        {weekDates.map((date) => {
                          const dayEvents = eventsForDate(date);
                          return (
                            <div
                              key={`week-${date.toISOString()}`}
                              role="button"
                              tabIndex={0}
                              className={cn(
                                "space-y-1 rounded-xl border border-white/30 bg-white/45 p-1 shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md transition-colors sm:space-y-2 sm:rounded-2xl sm:p-2 dark:border-white/10 dark:bg-white/10",
                                canCreateCalendar
                                  ? "cursor-pointer hover:bg-white/60 dark:hover:bg-white/15"
                                  : "cursor-default"
                              )}
                              onClick={() => openCreateForDate(date)}
                              onKeyDown={(e) => {
                                if (
                                  (e.key === "Enter" || e.key === " ") &&
                                  canCreateCalendar
                                ) {
                                  e.preventDefault();
                                  openCreateForDate(date);
                                }
                              }}
                            >
                              {dayEvents.map((ev) =>
                                isCalendarTask(ev) ? (
                                  renderEventPill(
                                    ev,
                                    date,
                                    `week-${date.toISOString()}`
                                  )
                                ) : (
                                  <button
                                    key={ev.id}
                                    type="button"
                                    className={cn(
                                      "block w-full rounded-md border-0 px-1 py-1 text-left text-[10px] font-medium sm:px-2 sm:py-1.5 sm:text-xs",
                                      getEventColor(ev)
                                    )}
                                    title={ev.title}
                                    onClick={(e) => handleSelectEvent(ev, e)}
                                  >
                                    <span className="line-clamp-2">{ev.title}</span>
                                  </button>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
        </div>
      </div>
      )}

      {/* Event detail popover */}
      <AnimatePresence>
        {detailEvent && (
          <>
            <motion.div
              key="event-popover-backdrop"
              className="fixed inset-0 z-40"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeDetailPopover}
            />
            <motion.div
              key={detailEvent.id}
              className="glass-popover fixed z-50 max-h-[min(80dvh,520px)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl p-4 sm:p-5"
              style={popupStyle}
              initial={{ opacity: 0, scale: 0.95, x: slideFromX }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <div className="flex items-center gap-2.5 pr-24">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      getEventColorDot(detailEvent)
                    )}
                  />
                  <h3
                    className={cn(
                      "text-lg font-semibold leading-tight text-foreground",
                      isCalendarTask(detailEvent) &&
                        isTaskCompleted(detailEvent) &&
                        "line-through text-muted-foreground",
                      isCalendarFollowUp(detailEvent) &&
                        isFollowUpCompleted(detailEvent) &&
                        "line-through text-muted-foreground"
                    )}
                  >
                    {detailEvent.title}
                  </h3>
                </div>

                <div className="absolute right-0 top-0 flex items-center gap-0.5">
                  {isCalendarMeeting(detailEvent) && (
                    <>
                      <RequirePermission module="Calendar" action="edit">
                        <button
                          type="button"
                          aria-label="Edit event"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10"
                          onClick={() => openEditForEvent(detailEvent)}
                        >
                          <Pencil className="size-4" />
                        </button>
                      </RequirePermission>
                      <RequirePermission module="Calendar" action="delete">
                        <button
                          type="button"
                          aria-label="Delete event"
                          disabled={isDeleting}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/50 hover:text-foreground disabled:opacity-50 dark:hover:bg-white/10"
                          onClick={() => void handleDeleteEvent(detailEvent)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </RequirePermission>
                    </>
                  )}
                  {isCalendarTask(detailEvent) && (
                    <RequirePermission module="Calendar" action="edit">
                      <button
                        type="button"
                        aria-label={
                          isTaskCompleted(detailEvent)
                            ? "Mark incomplete"
                            : "Mark complete"
                        }
                        disabled={completingTaskId === detailEvent.id}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/50 hover:text-foreground disabled:opacity-50 dark:hover:bg-white/10"
                        onClick={(e) =>
                          void handleToggleTaskComplete(detailEvent, e)
                        }
                      >
                        <Check className="size-4" />
                      </button>
                    </RequirePermission>
                  )}
                  <button
                    type="button"
                    aria-label="Close"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10"
                    onClick={closeDetailPopover}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <hr className="my-4 border-white/30 dark:border-white/10" />

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {isCalendarTask(detailEvent)
                      ? "Deadline"
                      : isCalendarFollowUp(detailEvent)
                        ? "Follow-up Date"
                        : "Date & Time"}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-sm text-foreground",
                      isCalendarTask(detailEvent) &&
                        isTaskCompleted(detailEvent) &&
                        "line-through text-muted-foreground",
                      isCalendarFollowUp(detailEvent) &&
                        isFollowUpCompleted(detailEvent) &&
                        "line-through text-muted-foreground"
                    )}
                  >
                    {formatEventDateTimeRange(detailEvent)}
                  </p>
                </div>
                {getEventMeetingLink(detailEvent) && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Meeting Link
                    </p>
                    <a
                      href={getEventMeetingLink(detailEvent)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-control mt-1.5 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-white/40 dark:hover:bg-white/15"
                    >
                      <ExternalLink className="size-3.5" />
                      Join meeting
                    </a>
                  </div>
                )}

                {getEventParticipants(detailEvent).length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Participants
                    </p>
                    <ul className="glass-inset mt-1.5 space-y-1.5 rounded-md p-3">
                      {getEventParticipants(detailEvent).map((participant, i) => (
                        <li
                          key={`${participant.name}-${i}`}
                          className="text-sm text-foreground"
                        >
                          {participant.name}
                          {participant.role && (
                            <span className="text-xs font-normal text-muted-foreground">
                              {" "}
                              ({participant.role})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {isCalendarFollowUp(detailEvent) ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Details
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p
                        className={cn(
                          "min-w-0 text-sm text-foreground",
                          isFollowUpCompleted(detailEvent) &&
                            "line-through text-muted-foreground"
                        )}
                      >
                        {getEventDescription(detailEvent) || "—"}
                      </p>
                      <FollowUpDetailsButton
                        event={detailEvent}
                        onNavigate={closeDetailPopover}
                      />
                    </div>
                    <FollowUpContactActions event={detailEvent} />
                    <div className="mt-4">
                      {isFollowUpCompleted(detailEvent) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled
                          className="w-full border-emerald-200 bg-emerald-50 text-emerald-700 opacity-80"
                        >
                          <Check className="mr-2 size-4" />
                          Completed
                        </Button>
                      ) : (
                        <RequirePermission module="Leads" action="edit">
                          <Button
                            type="button"
                            size="sm"
                            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={
                              !canEditLeads ||
                              completingFollowUpId === detailEvent.id
                            }
                            onClick={(e) =>
                              void handleMarkFollowUpDone(detailEvent, e)
                            }
                          >
                            <Check className="mr-2 size-4" />
                            {completingFollowUpId === detailEvent.id
                              ? "Saving…"
                              : "Mark as Done"}
                          </Button>
                        </RequirePermission>
                      )}
                    </div>
                  </div>
                ) : getEventDescription(detailEvent) ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {isCalendarTask(detailEvent) ? "Details" : "Description"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {getEventDescription(detailEvent)}
                    </p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEventId
                ? "Edit Event"
                : entryMode === "task"
                  ? "Add Task"
                  : "Add Event"}
            </DialogTitle>
            <DialogDescription>
              {editingEventId
                ? "Update meeting details on your calendar."
                : entryMode === "task"
                  ? "Create a personal to-do with a deadline."
                  : "Schedule a meeting or internal event on your calendar."}
            </DialogDescription>
          </DialogHeader>

          {!editingEventId && (
            <div className="inline-flex w-fit rounded-full border border-white/60 bg-white/45 p-1 shadow-sm backdrop-blur-md">
              <button
                type="button"
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  entryMode === "event"
                    ? "bg-sky-100 text-sky-800 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setEntryMode("event")}
              >
                Event
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  entryMode === "task"
                    ? "bg-sky-100 text-sky-800 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setEntryMode("task")}
              >
                Task
              </button>
            </div>
          )}

          {entryMode === "task" && !editingEventId ? (
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Task Title</Label>
                <Input
                  id="task-title"
                  placeholder="Call supplier / prepare quote"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-deadline">Deadline</Label>
                <Input
                  id="task-deadline"
                  type="datetime-local"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  placeholder="Notes or checklist..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Task"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
          <form onSubmit={handleSaveEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                placeholder="Weekly team sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select
                value={eventType}
                onValueChange={(v) => v && setEventType(v as MeetingType)}
                items={MEETING_TYPE_OPTIONS.map((option) => ({
                  value: option,
                  label: option,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Event Type" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start Date & Time</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End Date & Time</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Participants</Label>
              {canViewUsers ? (
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No users available.
                    </p>
                  ) : (
                    users.map((user) => {
                      const userId = String(user._id);
                      return (
                        <label
                          key={userId}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={participantIds.includes(userId)}
                            onCheckedChange={() => toggleParticipant(userId)}
                          />
                          <span>
                            {user.name}{" "}
                            {user.role && (
                              <span className="text-xs font-normal text-muted-foreground">
                                ({user.role})
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div
                        className="flex max-h-40 cursor-not-allowed items-center rounded-lg border border-dashed bg-muted/40 p-3 opacity-70"
                        aria-disabled="true"
                      >
                        <p className="text-sm text-muted-foreground">
                          Participant assignment unavailable
                        </p>
                      </div>
                    }
                  />
                  <TooltipContent>
                    Requires User View permission
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-link">Meeting Link</Label>
              <Input
                id="event-link"
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                placeholder="Agenda or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingEventId
                    ? "Save Changes"
                    : "Add Event"}
              </Button>
            </DialogFooter>
          </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
