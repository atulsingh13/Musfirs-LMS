import axios from "axios";
import { api } from "@/services/api";

export type MeetingType =
  | "Internal Sync"
  | "Client Meeting"
  | "Daily Standup"
  | "Sprint Planning"
  | "Project Demo"
  | "Code Review"
  | "Interview / HR"
  | "Townhall"
  | "Other";

export const DEFAULT_MEETING_TYPE: MeetingType = "Internal Sync";

/** Unified calendar entry kinds from GET /calendar/all */
export type CalendarEventType = "event" | "task" | "follow-up" | "meeting";

export interface ApiCalendarEvent {
  id: string;
  title: string;
  date: string;
  startDate: string;
  endDate: string;
  type: CalendarEventType;
  status: string;
  isCompleted?: boolean;
  rawData: Record<string, unknown>;
}

export interface CreateCalendarTaskInput {
  title: string;
  deadline: string;
  description?: string;
}

export interface CalendarEventsResponse {
  success: boolean;
  count: number;
  data: { events: ApiCalendarEvent[] };
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  participants?: string[];
  meetingLink?: string;
  type?: MeetingType;
  eventType?: MeetingType;
}

export interface CalendarEventMutationResponse {
  success: boolean;
  message: string;
  data: {
    event: ApiCalendarEvent;
  };
}

export const MEETING_TYPE_OPTIONS: MeetingType[] = [
  "Internal Sync",
  "Client Meeting",
  "Daily Standup",
  "Sprint Planning",
  "Project Demo",
  "Code Review",
  "Interview / HR",
  "Townhall",
  "Other",
];

const MEETING_PILL_COLORS: Record<string, string> = {
  "Internal Sync": "bg-indigo-500 text-white hover:bg-indigo-600",
  "Client Meeting": "bg-sky-500 text-white hover:bg-sky-600",
  "Daily Standup": "bg-emerald-500 text-white hover:bg-emerald-600",
  "Sprint Planning": "bg-violet-500 text-white hover:bg-violet-600",
  "Project Demo": "bg-amber-500 text-white hover:bg-amber-600",
  "Code Review": "bg-teal-500 text-white hover:bg-teal-600",
  "Interview / HR": "bg-pink-500 text-white hover:bg-pink-600",
  Townhall: "bg-fuchsia-500 text-white hover:bg-fuchsia-600",
  Other: "bg-slate-500 text-white hover:bg-slate-600",
  "Client Call": "bg-sky-500 text-white hover:bg-sky-600",
  Internal: "bg-indigo-500 text-white hover:bg-indigo-600",
};

const MEETING_DOT_COLORS: Record<string, string> = {
  "Internal Sync": "bg-indigo-500",
  "Client Meeting": "bg-sky-500",
  "Daily Standup": "bg-emerald-500",
  "Sprint Planning": "bg-violet-500",
  "Project Demo": "bg-amber-500",
  "Code Review": "bg-teal-500",
  "Interview / HR": "bg-pink-500",
  Townhall: "bg-fuchsia-500",
  Other: "bg-slate-500",
  "Client Call": "bg-sky-500",
  Internal: "bg-indigo-500",
};

const TASK_PILL_COLOR =
  "bg-sky-100 text-sky-900 hover:bg-sky-200 border-l-2 border-sky-500 dark:bg-sky-500/25 dark:text-sky-100 dark:hover:bg-sky-500/35";
const TASK_DOT_COLOR = "bg-sky-500";
const FOLLOW_UP_PILL_COLOR =
  "bg-yellow-500/20 text-yellow-800 hover:bg-yellow-500/30 dark:bg-amber-400/20 dark:text-amber-100 dark:hover:bg-amber-400/30";
const FOLLOW_UP_COMPLETED_PILL_COLOR =
  "bg-emerald-500/20 text-emerald-700 line-through opacity-70 hover:bg-emerald-500/30 dark:bg-emerald-400/20 dark:text-emerald-100 dark:hover:bg-emerald-400/30";
const FOLLOW_UP_DOT_COLOR = "bg-amber-500";
const FOLLOW_UP_COMPLETED_DOT_COLOR = "bg-emerald-500";
const FALLBACK_PILL_COLOR = "bg-slate-500 text-white hover:bg-slate-600";
const FALLBACK_DOT_COLOR = "bg-slate-500";

export function isCalendarMeeting(event: ApiCalendarEvent): boolean {
  return event.type === "event" || event.type === "meeting";
}

export function isCalendarTask(event: ApiCalendarEvent): boolean {
  return event.type === "task";
}

export function isCalendarFollowUp(event: ApiCalendarEvent): boolean {
  return event.type === "follow-up";
}

export function isTaskCompleted(event: ApiCalendarEvent): boolean {
  if (typeof event.isCompleted === "boolean") return event.isCompleted;
  return event.rawData?.isCompleted === true;
}

export function isFollowUpCompleted(event: ApiCalendarEvent): boolean {
  if (!isCalendarFollowUp(event)) return false;
  if (typeof event.isCompleted === "boolean") return event.isCompleted;
  return event.rawData?.isFollowUpCompleted === true;
}

/** Unified calendar feed (events + tasks + lead follow-ups). */
export async function getCalendarEvents(): Promise<CalendarEventsResponse> {
  const { data } = await api.get<CalendarEventsResponse>("/calendar/all");
  const events = Array.isArray(data?.data?.events) ? data.data.events : [];
  return {
    success: data?.success ?? true,
    count: data?.count ?? events.length,
    data: { events },
  };
}

export async function createCalendarTask(
  payload: CreateCalendarTaskInput
): Promise<CalendarEventMutationResponse> {
  const { data } = await api.post<CalendarEventMutationResponse>(
    "/calendar/tasks",
    payload
  );
  return data;
}

export async function completeCalendarTask(
  id: string
): Promise<CalendarEventMutationResponse> {
  const { data } = await api.put<CalendarEventMutationResponse>(
    `/calendar/tasks/${id}/complete`
  );
  return data;
}

export async function createCalendarEvent(
  payload: CreateCalendarEventInput
): Promise<CalendarEventMutationResponse> {
  const { data } = await api.post<CalendarEventMutationResponse>(
    "/calendar/events",
    payload
  );
  return data;
}

export async function updateCalendarEvent(
  id: string,
  payload: CreateCalendarEventInput
): Promise<CalendarEventMutationResponse> {
  const { data } = await api.put<CalendarEventMutationResponse>(
    `/calendar/events/${id}`,
    payload
  );
  return data;
}

export async function deleteCalendarEvent(
  id: string
): Promise<{ success: boolean; message: string }> {
  const { data } = await api.delete<{ success: boolean; message: string }>(
    `/calendar/events/${id}`
  );
  return data;
}

/** @deprecated use createCalendarEvent */
export const createMeeting = createCalendarEvent;

export function getCalendarErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ??
      fallback
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultMeetingStart(): string {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  return toDatetimeLocalValue(start);
}

export function defaultMeetingEnd(startValue?: string): string {
  const start = startValue ? new Date(startValue) : new Date();
  if (Number.isNaN(start.getTime())) {
    const fallback = new Date();
    fallback.setHours(fallback.getHours() + 2, 0, 0, 0);
    return toDatetimeLocalValue(fallback);
  }
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return toDatetimeLocalValue(end);
}

export function datetimeDefaultsForDate(date: Date): {
  start: string;
  end: string;
} {
  const start = new Date(date);
  start.setHours(9, 0, 0, 0);
  const end = new Date(date);
  end.setHours(10, 0, 0, 0);
  return {
    start: toDatetimeLocalValue(start),
    end: toDatetimeLocalValue(end),
  };
}

export function getEventColorDot(event: ApiCalendarEvent): string {
  if (isCalendarTask(event)) {
    return TASK_DOT_COLOR;
  }

  if (isCalendarFollowUp(event)) {
    return isFollowUpCompleted(event)
      ? FOLLOW_UP_COMPLETED_DOT_COLOR
      : FOLLOW_UP_DOT_COLOR;
  }

  if (!isCalendarMeeting(event)) {
    return FALLBACK_DOT_COLOR;
  }

  const meetingType =
    typeof event.rawData?.type === "string" ? event.rawData.type : event.status;

  return MEETING_DOT_COLORS[meetingType] ?? FALLBACK_DOT_COLOR;
}

export function formatEventDateTimeRange(event: ApiCalendarEvent): string {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const dateFmt = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isSameCalendarDay(start, end)) {
    return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  }

  return `${dateFmt.format(start)} ${timeFmt.format(start)} – ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}

export function getEventMeetingLink(event: ApiCalendarEvent): string {
  if (!isCalendarMeeting(event)) return "";
  const link = event.rawData?.meetingLink;
  return typeof link === "string" ? link : "";
}

export function getEventDescription(event: ApiCalendarEvent): string {
  const desc = event.rawData?.description;
  return typeof desc === "string" ? desc : "";
}

export function getFollowUpContactNumber(event: ApiCalendarEvent): string {
  if (!isCalendarFollowUp(event)) return "";
  const contact = event.rawData?.contactNumber;
  return typeof contact === "string" ? contact.trim() : "";
}

export function getFollowUpEmail(event: ApiCalendarEvent): string {
  if (!isCalendarFollowUp(event)) return "";
  const email = event.rawData?.email;
  return typeof email === "string" ? email.trim() : "";
}

export function getFollowUpLeadId(event: ApiCalendarEvent): string {
  if (!isCalendarFollowUp(event)) return "";
  const leadId = event.rawData?.leadId;
  return typeof leadId === "string" ? leadId.trim() : "";
}

export function toWhatsAppNumber(contactNumber: string): string {
  return contactNumber.replace(/[^0-9]/g, "");
}

export function getEventParticipants(
  event: ApiCalendarEvent
): { name: string; role?: string }[] {
  if (!isCalendarMeeting(event)) return [];
  const participants = event.rawData?.participants;
  if (!Array.isArray(participants)) return [];

  return participants.map((participant) => {
    if (typeof participant === "object" && participant !== null && "name" in participant) {
      const user = participant as { name?: string; role?: string };
      return { name: user.name ?? "Unknown", role: user.role };
    }
    return { name: String(participant) };
  });
}

export function getEventColor(event: ApiCalendarEvent): string {
  if (isCalendarTask(event)) {
    return TASK_PILL_COLOR;
  }

  if (isCalendarFollowUp(event)) {
    return isFollowUpCompleted(event)
      ? FOLLOW_UP_COMPLETED_PILL_COLOR
      : FOLLOW_UP_PILL_COLOR;
  }

  if (!isCalendarMeeting(event)) {
    return FALLBACK_PILL_COLOR;
  }

  const meetingType =
    typeof event.rawData?.type === "string" ? event.rawData.type : event.status;

  return MEETING_PILL_COLORS[meetingType] ?? FALLBACK_PILL_COLOR;
}

export function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function eventOccursOnDate(event: ApiCalendarEvent, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const start = new Date(event.startDate);
  const end = new Date(event.endDate);

  return start <= dayEnd && end >= dayStart;
}
