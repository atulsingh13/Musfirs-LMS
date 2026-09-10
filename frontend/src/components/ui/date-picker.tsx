import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import {
  Calendar,
  type CalendarCaptionLayout,
} from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseLocalDateKey(value: string) {
  // Prefer YYYY-MM-DD; also accept ISO timestamps from the API
  const ymd = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [year, month, day] = ymd.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDisplayDate(value: string) {
  const date = parseLocalDateKey(value);
  if (!date || Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  isDateDisabled?: (date: Date) => boolean;
  captionLayout?: CalendarCaptionLayout;
  fromYear?: number;
  toYear?: number;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  isDateDisabled,
  captionLayout,
  fromYear,
  toYear,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedKey = (() => {
    if (!value) return undefined;
    const date = parseLocalDateKey(value);
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="size-4" />
            {value ? formatDisplayDate(value) : placeholder}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          selected={selectedKey}
          isDateDisabled={isDateDisabled}
          captionLayout={captionLayout}
          fromYear={fromYear}
          toYear={toYear}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
