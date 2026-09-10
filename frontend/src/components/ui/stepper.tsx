import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StepperContextValue {
  activeStep: number;
  totalSteps: number;
  goNext: () => void;
  goBack: () => void;
  isSubmitting: boolean;
  nextLabel?: string;
  finalLabel?: string;
}

const StepperContext = createContext<StepperContextValue | null>(null);

function useStepperContext() {
  const context = useContext(StepperContext);
  if (!context) {
    throw new Error("Step must be used within a Stepper.");
  }
  return context;
}

interface StepProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function Step({ children }: StepProps) {
  return <>{children}</>;
}

interface StepperProps {
  children: ReactNode;
  initialStep?: number;
  /** Explicit total for footer label (e.g. 2 for owner, 4 for staff). Falls back to rendered Step count. */
  totalSteps?: number;
  onFinalStepCompleted?: () => void | Promise<void>;
  /** Return false to block advancing from the current step (0-based index). */
  onValidateStep?: (stepIndex: number) => boolean;
  /** Called when Back is pressed on the first step (e.g. return to type selection). */
  onBackFromFirst?: () => void;
  isSubmitting?: boolean;
  nextLabel?: string;
  backLabel?: string;
  finalLabel?: string;
  className?: string;
}

export function Stepper({
  children,
  initialStep = 0,
  totalSteps: totalStepsProp,
  onFinalStepCompleted,
  onValidateStep,
  onBackFromFirst,
  isSubmitting = false,
  nextLabel = "Continue",
  backLabel = "Back",
  finalLabel = "Add User",
  className,
}: StepperProps) {
  const steps = useMemo(
    () =>
      Children.toArray(children).filter(
        (child): child is ReactElement<StepProps> =>
          isValidElement(child) && child.type === Step
      ),
    [children]
  );

  const [activeStep, setActiveStep] = useState(initialStep);
  // Prefer rendered Step count so submit never targets an empty step index.
  const totalSteps =
    steps.length > 0 ? steps.length : Math.max(totalStepsProp ?? 1, 1);
  // 1-based step for footer / submit checks
  const step = Math.min(activeStep + 1, totalSteps);
  const isLastStep = step === totalSteps;
  const currentStep = steps[activeStep] ?? null;

  async function goNext() {
    if (!currentStep) return;

    if (onValidateStep && !onValidateStep(activeStep)) {
      return;
    }

    // Submit when step === totalSteps (owner: 2, staff: 4)
    if (isLastStep) {
      await onFinalStepCompleted?.();
      return;
    }
    setActiveStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }

  function goBack() {
    if (activeStep === 0) {
      onBackFromFirst?.();
      return;
    }
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }

  const backDisabled =
    isSubmitting || (activeStep === 0 && !onBackFromFirst);

  if (steps.length === 0) {
    return null;
  }

  return (
    <StepperContext.Provider
      value={{
        activeStep,
        totalSteps,
        goNext,
        goBack,
        isSubmitting,
        nextLabel,
        finalLabel,
      }}
    >
      <div className={cn("space-y-6", className)}>
        <ol className="flex items-start gap-2">
          {steps.map((stepItem, index) => {
            const completed = index < activeStep;
            const current = index === activeStep;

            return (
              <li
                key={stepItem.props.title}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-2",
                  index < steps.length - 1 && "relative"
                )}
              >
                <div className="flex w-full items-center">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                      completed &&
                        "border-emerald-600 bg-emerald-600 text-white",
                      current &&
                        !completed &&
                        "border-foreground bg-foreground text-background",
                      !completed &&
                        !current &&
                        "border-muted-foreground/30 bg-background text-muted-foreground"
                    )}
                  >
                    {completed ? <Check className="size-4" /> : index + 1}
                  </div>
                  {index < steps.length - 1 ? (
                    <div
                      className={cn(
                        "mx-2 h-px flex-1",
                        completed ? "bg-emerald-600" : "bg-border"
                      )}
                    />
                  ) : null}
                </div>
                <div className="w-full pr-2 text-left">
                  <p
                    className={cn(
                      "truncate text-xs font-medium",
                      current || completed
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {stepItem.props.title}
                  </p>
                  {stepItem.props.description ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {stepItem.props.description}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {currentStep ? (
          <div className="min-h-[280px]">{currentStep.props.children}</div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={backDisabled}
          >
            {backLabel}
          </Button>
          <div className="text-xs text-muted-foreground">
            Step {step} of {totalStepsProp ?? totalSteps}
          </div>
          <Button
            type="button"
            onClick={() => void goNext()}
            disabled={isSubmitting || !currentStep}
          >
            {isSubmitting
              ? "Saving..."
              : isLastStep
                ? finalLabel
                : nextLabel}
          </Button>
        </div>
      </div>
    </StepperContext.Provider>
  );
}

export function useStepper() {
  return useStepperContext();
}
