import { Link, useLocation } from "react-router-dom";
import { ChevronRight, User, X } from "lucide-react";
import { toast } from "sonner";
import { navigationConfig } from "@/config/navigation";
import { useAuth } from "@/context/auth-context";
import { usePermission } from "@/hooks/usePermission";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const OWNER_HIDDEN_NAV_TITLES = new Set(["Follow-ups", "Clients"]);

const PROFILE_NAV_HREF = "/profile";

function handlePendingNavClick(
  event: React.MouseEvent,
  href: string,
  isPending: boolean
) {
  const isProfileLink = href === PROFILE_NAV_HREF;
  if (isPending && !isProfileLink) {
    event.preventDefault();
    toast.warning("Please update your temporary password first.");
  }
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const { can, role, user } = useAuth();
  const { canView } = usePermissions();
  const canViewUsers = usePermission("Users", "view");
  const { isMobile, setOpenMobile } = useSidebar();

  const isOwner = role === "administrator";
  const isPending = user?.status === "Pending invite";

  function closeMobileNav() {
    if (isMobile) setOpenMobile(false);
  }

  function onNavClick(
    event: React.MouseEvent,
    href: string,
    isPendingUser: boolean
  ) {
    handlePendingNavClick(event, href, isPendingUser);
    if (!event.defaultPrevented) {
      closeMobileNav();
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          {isPending ? (
            <div className="flex min-w-0 items-center opacity-60">
              <span className="hidden group-data-[collapsible=icon]:block">
                <BrandLogo size="sm" compact />
              </span>
              <span className="group-data-[collapsible=icon]:hidden">
                <BrandLogo size="sm" />
              </span>
            </div>
          ) : (
            <Link
              to="/dashboard"
              className="flex min-w-0 items-center"
              onClick={closeMobileNav}
            >
              <span className="hidden group-data-[collapsible=icon]:block">
                <BrandLogo size="sm" compact />
              </span>
              <span className="group-data-[collapsible=icon]:hidden">
                <BrandLogo size="sm" />
              </span>
            </Link>
          )}

          {isMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setOpenMobile(false)}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationConfig.map((group) => {
          const visibleItems = group.items.filter((item) => {
            // Module-backed links: require permissions[module].view
            if (item.module) {
              if (item.module === "Users") {
                return canViewUsers;
              }
              return canView(item.module);
            }
            // Non-module links (Follow-ups / Clients): legacy role check
            if (item.permission && !can(item.permission)) {
              return false;
            }
            if (isOwner && OWNER_HIDDEN_NAV_TITLES.has(item.title)) {
              return false;
            }
            return Boolean(item.permission);
          });
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label || "main"}>
              {group.label && (
                <SidebarGroupLabel className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.children?.some((c) => pathname === c.href) ??
                        false);

                    if (item.children) {
                      return (
                        <Collapsible
                          key={item.href}
                          defaultOpen={isActive}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger
                              render={
                                <SidebarMenuButton
                                  tooltip={item.title}
                                  isActive={isActive}
                                  className={
                                    isPending
                                      ? "cursor-not-allowed opacity-50"
                                      : undefined
                                  }
                                >
                                  <item.icon className="size-4" />
                                  <span>{item.title}</span>
                                  <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                              }
                            />
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.children.map((child) => (
                                  <SidebarMenuSubItem key={child.href}>
                                    <SidebarMenuSubButton
                                      render={
                                        <Link
                                          to={child.href}
                                          onClick={(event) =>
                                            onNavClick(
                                              event,
                                              child.href,
                                              isPending
                                            )
                                          }
                                          className={
                                            isPending
                                              ? "cursor-not-allowed opacity-50"
                                              : undefined
                                          }
                                        >
                                          {child.title}
                                        </Link>
                                      }
                                      isActive={
                                        !isPending && pathname === child.href
                                      }
                                    />
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={
                            <Link
                              to={item.href}
                              onClick={(event) =>
                                onNavClick(event, item.href, isPending)
                              }
                              className={
                                isPending
                                  ? "cursor-not-allowed opacity-50"
                                  : undefined
                              }
                            />
                          }
                          tooltip={
                            isPending
                              ? "Update your password to access this section"
                              : item.title
                          }
                          isActive={!isPending && pathname === item.href}
                        >
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
        <SidebarGroup
          className={cn(
            "mt-auto",
            // Mobile: keep profile inside the drawer, above browser chrome
            "max-md:shrink-0 max-md:border-t max-md:border-sidebar-border max-md:bg-sidebar max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:pt-2"
          )}
        >
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link to={PROFILE_NAV_HREF} onClick={closeMobileNav} />
                  }
                  tooltip="My Profile"
                  isActive={pathname === PROFILE_NAV_HREF}
                >
                  <User className="size-4" />
                  <span>My Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
