import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { GuestGuard } from "@/components/auth/guest-guard";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordApi } from "@/services/auth-api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await forgotPasswordApi(email);
    } catch {
      // Anti-enumeration: always show success regardless of backend outcome
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <GuestGuard>
      <AuthLayout
        title="Forgot password"
        description={
          submitted
            ? "Check with your administrator if you do not hear back soon"
            : "Request an administrator to reset your password"
        }
      >
        {submitted ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-white/80">
              Request Sent. If your email matches an active account, the
              administrator has been notified to reset your password.
            </p>
            <Button
              render={<Link to="/login" />}
              variant="outline"
              className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              Back to login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="border-white/30 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/40"
              />
            </div>

            <Button
              type="submit"
              className="w-full border border-white/20 bg-white/90 text-slate-900 hover:bg-white"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Submit Request
            </Button>

            <p className="text-center text-sm">
              <Link
                to="/login"
                className="text-white/60 transition-colors hover:text-white"
              >
                Back to login
              </Link>
            </p>
          </form>
        )}
      </AuthLayout>
    </GuestGuard>
  );
}
