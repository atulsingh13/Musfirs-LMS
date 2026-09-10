import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { GuestGuard } from "@/components/auth/guest-guard";

export function LoginPage() {
  return (
    <GuestGuard>
      <AuthLayout
        title="Welcome back"
        description="Sign in to your Musafir account"
      >
        <LoginForm />
      </AuthLayout>
    </GuestGuard>
  );
}
