import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-white/90">
              Password
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs text-white/60 hover:text-white"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="border-white/30 bg-white/10 pr-10 text-white placeholder:text-white/40 focus-visible:ring-white/40"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-white/50 transition-colors hover:text-white focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-200" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full border border-white/20 bg-white/90 text-slate-900 hover:bg-white"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      {import.meta.env.DEV && (
        <div className="rounded-xl border border-dashed border-white/25 bg-white/5 p-3">
          <p className="mb-2 text-xs font-medium text-white/80">Demo account</p>
          <p className="mb-2 text-[11px] text-white/50">
            Seeded admin (after{" "}
            <code className="text-white/70">npm run seed:admin</code>)
          </p>
          <button
            type="button"
            className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2.5 text-left text-xs text-white/90 transition-colors hover:bg-white/10"
            onClick={() => {
              void import("@/lib/auth-store").then(({ DEMO_CREDENTIALS }) => {
                const admin = DEMO_CREDENTIALS.find(
                  (c) => c.email === "admin@divniq.com"
                );
                if (admin) {
                  setEmail(admin.email);
                  setPassword(admin.password);
                  setError("");
                }
              });
            }}
          >
            <span className="block font-medium">Administrator</span>
            <span className="mt-0.5 block text-white/50">admin@divniq.com</span>
          </button>
        </div>
      )}
    </div>
  );
}
