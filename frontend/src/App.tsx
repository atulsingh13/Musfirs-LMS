import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AppToaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/auth-context";
import { NotificationProvider } from "@/context/notification-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ModulePermissionRoute } from "@/components/auth/module-permission-route";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GradientBackground } from "@/components/GradientBackground";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoginPage } from "@/pages/LoginPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { UsersPage } from "@/pages/UsersPage";
import { UserDetailPage } from "@/pages/UserDetailPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { LeadsPage } from "@/pages/LeadsPage";
import { BookingsPage } from "@/pages/BookingsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import {
  ClientsPage,
  DealsPage,
  FollowUpsPage,
  InvoicePage,
  ProposalsPage,
} from "@/pages/CrmPlaceholderPages";

function LegacyRedirect({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

export default function App() {
  // #region agent log
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7245/ingest/8e23b003-f8b6-4cc6-ba2c-068d5409bacc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "73a298",
      },
      body: JSON.stringify({
        sessionId: "73a298",
        runId: "pre-fix",
        hypothesisId: "D",
        location: "frontend/src/App.tsx:App",
        message: "App render with BrowserRouter",
        data: {
          pathname: window.location.pathname,
          routerType: "BrowserRouter",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  return (
    <ThemeProvider>
      <GradientBackground />
      <AppToaster />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
          <TooltipProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<Navigate to="/login" replace />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route element={<ModulePermissionRoute module="Dashboard" />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                  </Route>

                  <Route element={<ModulePermissionRoute module="Calendar" />}>
                    <Route path="/calendar" element={<CalendarPage />} />
                  </Route>

                  <Route
                    path="/tasks"
                    element={<LegacyRedirect to="/dashboard" />}
                  />

                  <Route element={<ModulePermissionRoute module="Users" />}>
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/users/:userId" element={<UserDetailPage />} />
                  </Route>

                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />

                  <Route path="/crm/follow-ups" element={<FollowUpsPage />} />
                  <Route
                    path="/crm/meetings"
                    element={<LegacyRedirect to="/calendar" />}
                  />
                  <Route path="/crm/clients" element={<ClientsPage />} />

                  <Route element={<ModulePermissionRoute module="Leads" />}>
                    <Route path="/leads" element={<LeadsPage />} />
                  </Route>
                  <Route element={<ModulePermissionRoute module="Bookings" />}>
                    <Route path="/bookings" element={<BookingsPage />} />
                  </Route>
                  <Route
                    path="/crm/leads"
                    element={<LegacyRedirect to="/leads" />}
                  />
                  <Route path="/crm/deals" element={<DealsPage />} />
                  <Route path="/crm/proposals" element={<ProposalsPage />} />
                  <Route path="/pages/invoice" element={<InvoicePage />} />

                  <Route
                    path="/pages/calendar"
                    element={<LegacyRedirect to="/calendar" />}
                  />
                  <Route
                    path="/pages/tasks"
                    element={<LegacyRedirect to="/dashboard" />}
                  />
                  <Route
                    path="/admin/users"
                    element={<LegacyRedirect to="/users" />}
                  />
                  <Route
                    path="/admin/roles"
                    element={<LegacyRedirect to="/users" />}
                  />
                  <Route
                    path="/admin/settings"
                    element={<LegacyRedirect to="/users" />}
                  />
                  <Route path="/bdes" element={<LegacyRedirect to="/users" />} />
                  <Route path="/roles" element={<LegacyRedirect to="/users" />} />
                  <Route
                    path="/settings"
                    element={<LegacyRedirect to="/users" />}
                  />
                  <Route
                    path="/hr"
                    element={<LegacyRedirect to="/dashboard" />}
                  />
                  <Route
                    path="/my-attendance"
                    element={<LegacyRedirect to="/dashboard" />}
                  />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
