import { Link } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfilePictureUrl } from "@/services/users-api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const { user, roleLabel, logout } = useAuth();

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .join("") ?? "?";

  const profilePictureUrl = getProfilePictureUrl(user?.profilePicture);

  return (
    <header className="glass-panel sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-white/20 px-3 dark:border-white/10 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:mr-2 sm:block" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <AppBreadcrumb />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <GlobalSearch />

        <NotificationsDropdown />

        <ThemeToggle />

        <Separator orientation="vertical" className="hidden h-4 sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-8 gap-2 px-1.5 sm:px-2">
                <Avatar className="size-7">
                  {profilePictureUrl ? (
                    <AvatarImage
                      src={profilePictureUrl}
                      alt={user?.name ?? "Profile"}
                    />
                  ) : null}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start lg:flex">
                  <span className="text-xs leading-none font-medium">
                    {user?.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {roleLabel}
                  </span>
                </div>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span>{user?.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link to="/profile" />}>
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => void logout()}
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
