import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
}

function Checkbox({
  checked = false,
  onCheckedChange,
  className,
  id,
  disabled,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "peer size-4 shrink-0 cursor-pointer rounded-[4px] border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50",
        // Unchecked: frosted glass fill + darker edge so boxes stay visible on translucent rows
        checked
          ? "border-violet-600 bg-violet-600 text-white shadow-sm hover:bg-violet-700"
          : "border-slate-500/60 bg-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55),0_1px_2px_rgba(15,23,42,0.08)] backdrop-blur-sm hover:border-slate-600/75 hover:bg-white/85 dark:border-white/55 dark:bg-white/15 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.35)] dark:hover:border-white/70 dark:hover:bg-white/25",
        className
      )}
    >
      {checked && <Check className="mx-auto size-3 text-white" strokeWidth={3} />}
    </button>
  );
}

export { Checkbox };
