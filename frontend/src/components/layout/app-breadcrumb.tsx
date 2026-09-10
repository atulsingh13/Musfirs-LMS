import { Fragment } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { navigationConfig } from "@/config/navigation";

type Crumb = {
  label: string;
  href?: string;
};

const STATIC_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  calendar: "Calendar",
  users: "Users",
  profile: "My Profile",
  crm: "CRM",
  "follow-ups": "Follow-ups",
  clients: "Clients",
  meetings: "Meetings",
  deals: "Deals",
  proposals: "Proposals",
  pages: "Pages",
  invoice: "Invoice",
  admin: "Admin",
  roles: "Roles",
  settings: "Settings",
};

function labelFromNav(href: string): string | null {
  for (const group of navigationConfig) {
    for (const item of group.items) {
      if (item.href === href) return item.title;
      const child = item.children?.find((c) => c.href === href);
      if (child) return child.title;
    }
  }
  return null;
}

function titleCaseSegment(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildCrumbs(pathname: string, userId?: string): Crumb[] {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  if (normalized === "/" || normalized === "/dashboard") {
    return [{ label: "Dashboard" }];
  }

  const segments = normalized.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/dashboard" }];

  let accumulated = "";
  segments.forEach((segment, index) => {
    accumulated += `/${segment}`;
    const isLast = index === segments.length - 1;

    if (segment === userId) {
      crumbs.push({
        label: "User details",
        href: isLast ? undefined : accumulated,
      });
      return;
    }

    const navLabel = labelFromNav(accumulated);
    const label =
      navLabel ?? STATIC_LABELS[segment] ?? titleCaseSegment(segment);

    crumbs.push({
      label,
      href: isLast ? undefined : accumulated,
    });
  });

  return crumbs;
}

export function AppBreadcrumb() {
  const { pathname } = useLocation();
  const { userId } = useParams();
  const crumbs = buildCrumbs(pathname, userId);

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const hideOnMobile = !isLast && crumbs.length > 1;

          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? (
                <BreadcrumbSeparator
                  className={hideOnMobile ? "hidden sm:block" : undefined}
                />
              ) : null}
              <BreadcrumbItem
                className={hideOnMobile ? "hidden sm:inline-flex" : undefined}
              >
                {isLast || !crumb.href ? (
                  <BreadcrumbPage className="inline-flex max-w-[40vw] items-center gap-1.5 truncate sm:max-w-none">
                    {index === 0 ? (
                      <Home className="size-3.5 shrink-0" aria-hidden="true" />
                    ) : null}
                    <span className="truncate">{crumb.label}</span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      to={crumb.href}
                      className="inline-flex items-center gap-1.5"
                    >
                      {index === 0 ? (
                        <Home className="size-3.5" aria-hidden="true" />
                      ) : null}
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
