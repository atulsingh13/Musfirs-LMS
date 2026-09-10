import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthLoadingSpinner } from "@/components/auth/auth-loading-spinner";
import { useAuth } from "@/context/auth-context";

/**
 * Gates authenticated app routes.
 * While auth status is resolving, always show a spinner — never null/empty.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingSpinner message="Checking session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
