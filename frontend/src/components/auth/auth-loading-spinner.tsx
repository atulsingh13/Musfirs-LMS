import { Loader2 } from "lucide-react";

/** Full-viewport auth loading state — never render null while checking session. */
export function AuthLoadingSpinner({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
      <Loader2
        className="size-8 animate-spin text-muted-foreground"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

export default AuthLoadingSpinner;
