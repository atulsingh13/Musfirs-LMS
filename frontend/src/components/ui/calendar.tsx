import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Mirrors Shadcn DayPicker classNames used for caption dropdowns. */
const calendarClassNames = {
  caption_dropdowns: "flex min-w-0 flex-1 items-center justify-center gap-1.5",
  dropdown:
    "relative inline-flex h-8 items-center rounded-md border border-input bg-background text-foreground shadow-xs transition-colors hover:bg-muted/50 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
  dropdown_month: "min-w-[7.25rem]",
  dropdown_year: "min-w-[4.75rem]",
  dropdown_icon:
    "pointer-events-none absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground",
  dropdown_select:
    "h-full w-full cursor-pointer appearance-none bg-transparent py-0 pl-2 pr-6 text-xs font-medium outline-none",
} as const;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const ymd = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function CaptionDropdown({
  "aria-label": ariaLabel,
  value,
  onChange,
  className,
  children,
}: {
  "aria-label": string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(calendarClassNames.dropdown, className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={calendarClassNames.dropdown_select}
      >
        {children}
      </select>
      <ChevronDown
        className={calendarClassNames.dropdown_icon}
        aria-hidden
      />
    </div>
  );
}

export type CalendarCaptionLayout = "buttons" | "dropdown" | "dropdown-buttons";

interface CalendarProps {
  selected?: string;
  onSelect?: (value: string) => void;
  className?: string;
  isDateDisabled?: (date: Date) => boolean;
  /** Enable month/year dropdowns (e.g. for Date of Birth). */
  captionLayout?: CalendarCaptionLayout;
  fromYear?: number;
  toYear?: number;
}

export function Calendar({
  selected,
  onSelect,
  className,
  isDateDisabled,
  captionLayout = "buttons",
  fromYear = 1950,
  toYear = new Date().getFullYear(),
}: CalendarProps) {
  const initial = selected ? parseDateKey(selected) : new Date();
  const [view, setView] = useState({
    year: Math.min(Math.max(initial.getFullYear(), fromYear), toYear),
    month: initial.getMonth(),
  });

  const showDropdowns =
    captionLayout === "dropdown" || captionLayout === "dropdown-buttons";
  const showNavButtons =
    captionLayout === "buttons" || captionLayout === "dropdown-buttons";

  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = toYear; year >= fromYear; year -= 1) {
      list.push(year);
    }
    return list;
  }, [fromYear, toYear]);

  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(view.year, view.month, 1));

  const cells = useMemo(() => {
    const firstDay = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const daysInPrev = new Date(view.year, view.month, 0).getDate();
    const result: { day: number; inMonth: boolean; date: Date }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrev - i;
      result.push({
        day,
        inMonth: false,
        date: new Date(view.year, view.month - 1, day),
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      result.push({
        day,
        inMonth: true,
        date: new Date(view.year, view.month, day),
      });
    }
    const trailing = 42 - result.length;
    for (let day = 1; day <= trailing; day++) {
      result.push({
        day,
        inMonth: false,
        date: new Date(view.year, view.month + 1, day),
      });
    }
    return result;
  }, [view.year, view.month]);

  function goPrevMonth() {
    setView((v) => {
      if (v.month === 0) {
        if (v.year <= fromYear) return v;
        return { year: v.year - 1, month: 11 };
      }
      return { year: v.year, month: v.month - 1 };
    });
  }

  function goNextMonth() {
    setView((v) => {
      if (v.month === 11) {
        if (v.year >= toYear) return v;
        return { year: v.year + 1, month: 0 };
      }
      return { year: v.year, month: v.month + 1 };
    });
  }

  const canGoPrev =
    view.year > fromYear || (view.year === fromYear && view.month > 0);
  const canGoNext =
    view.year < toYear || (view.year === toYear && view.month < 11);

  return (
    <div className={cn("p-3", className)}>
      <div className="mb-3 flex items-center justify-between gap-1">
        {showNavButtons ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={goPrevMonth}
            disabled={!canGoPrev}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
        ) : (
          <span className="size-7 shrink-0" />
        )}

        {showDropdowns ? (
          <div
            data-slot="caption-dropdowns"
            className={calendarClassNames.caption_dropdowns}
          >
            <CaptionDropdown
              aria-label="Month"
              value={view.month}
              onChange={(month) => setView((v) => ({ ...v, month }))}
              className={calendarClassNames.dropdown_month}
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </CaptionDropdown>
            <CaptionDropdown
              aria-label="Year"
              value={view.year}
              onChange={(year) => setView((v) => ({ ...v, year }))}
              className={calendarClassNames.dropdown_year}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </CaptionDropdown>
          </div>
        ) : (
          <span className="text-sm font-medium">{monthLabel}</span>
        )}

        {showNavButtons ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={goNextMonth}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <span className="size-7 shrink-0" />
        )}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 font-medium text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((cell, idx) => {
          const key = toDateKey(cell.date);
          const isSelected = selected === key;
          const isDisabled =
            !cell.inMonth || (isDateDisabled?.(cell.date) ?? false);
          return (
            <button
              key={`${key}-${idx}`}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect?.(key)}
              className={cn(
                "size-8 rounded-md text-sm transition-colors",
                !cell.inMonth && "text-muted-foreground/40",
                cell.inMonth && !isDisabled && "hover:bg-muted",
                isDisabled && cell.inMonth && "text-muted-foreground/40",
                isSelected &&
                  "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
