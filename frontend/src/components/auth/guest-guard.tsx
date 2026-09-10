import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLoadingSpinner } from "@/components/auth/auth-loading-spinner";
import { useAuth } from "@/context/auth-context";

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Never blank while auth is still resolving
  if (isLoading) {
    return <AuthLoadingSpinner message="Checking session..." />;
  }

  if (isAuthenticated) {
    return <AuthLoadingSpinner message="Redirecting to dashboard..." />;
  }

  return <>{children}</>;
}
