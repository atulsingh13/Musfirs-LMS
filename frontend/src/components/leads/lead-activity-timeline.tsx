import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  StickyNote,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addLeadNote,
  fetchLeadActivities,
  type LeadActivity,
  type LeadActivityType,
} from "@/services/lead-activity-api";
import { cn } from "@/lib/utils";

const glassPanel =
  "rounded-2xl border border-white/40 bg-white/15 p-4 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-lg dark:border-white/10 dark:bg-white/5";

const activityMeta: Record<
  LeadActivityType,
  { label: string; icon: typeof StickyNote; badgeClass: string }
> = {
  Note_Added: {
    label: "Note",
    icon: StickyNote,
    badgeClass:
      "border-sky-300/60 bg-sky-500/15 text-sky-700 dark:border-sky-400/30 dark:text-sky-300",
  },
  Status_Changed: {
    label: "Status",
    icon: RefreshCw,
    badgeClass:
      "border-emerald-300/60 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300",
  },
  Call_Scheduled: {
    label: "Follow-up",
    icon: Phone,
    badgeClass:
      "border-amber-300/60 bg-amber-500/15 text-amber-700 dark:border-amber-400/30 dark:text-amber-300",
  },
  Call_Completed: {
    label: "Completed",
    icon: CheckCircle2,
    badgeClass:
      "border-emerald-300/60 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300",
  },
  Assigned: {
    label: "Assigned",
    icon: UserPlus,
    badgeClass:
      "border-violet-300/60 bg-violet-500/15 text-violet-700 dark:border-violet-400/30 dark:text-violet-300",
  },
  Lead_Created: {
    label: "Created",
    icon: Plus,
    badgeClass:
      "border-slate-300/60 bg-slate-500/15 text-slate-700 dark:border-slate-400/30 dark:text-slate-300",
  },
};

function actorName(activity: LeadActivity): string {
  const by = activity.performedBy;
  if (!by?._id) return by?.name?.trim() || "Website";
  if (by.name?.trim()) return by.name.trim();
  return `${by.first_name ?? ""} ${by.last_name ?? ""}`.trim() || "Website";
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

interface LeadActivityTimelineProps {
  leadId: string;
}

export function LeadActivityTimeline({ leadId }: LeadActivityTimelineProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchLeadActivities(leadId);
      setActivities(rows);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load activities"
      );
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const handleAddNote = async () => {
    const trimmed = note.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const created = await addLeadNote(leadId, trimmed);
      setActivities((prev) => [created, ...prev]);
      setNote("");
      toast.success("Note added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add note"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 border-t border-border/60 pt-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          Activity & Notes
        </h3>
        <p className="text-sm text-muted-foreground">
          Audit trail of status changes, assignments, follow-ups, and notes.
        </p>
      </div>

      <RequirePermission module="Leads" action="edit">
        <div className={cn(glassPanel, "space-y-3")}>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a note about this lead…"
            rows={3}
            className="border-border/60 bg-background/60 backdrop-blur-md"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleAddNote()}
              disabled={submitting || !note.trim()}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <StickyNote className="mr-2 h-4 w-4" />
              )}
              Add Note
            </Button>
          </div>
        </div>
      </RequirePermission>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading activity…
        </div>
      ) : activities.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
      ) : (
        <ol className="relative ml-3 space-y-5 border-l-2 border-border/70 pl-6">
          {activities.map((activity) => {
            const meta =
              activityMeta[activity.actionType] ?? activityMeta.Note_Added;
            const Icon = meta.icon;
            return (
              <li key={activity.id || activity._id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[1.9rem] flex size-8 items-center justify-center rounded-full border backdrop-blur-md",
                    meta.badgeClass
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className={cn(glassPanel, "space-y-1 py-3")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {actorName(activity)}
                    </span>
                    {activity.createdAt ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {relativeTime(activity.createdAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {activity.details}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default LeadActivityTimeline;
