import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CalendarCheck,
  LayoutDashboard,
  Layers,
  Search,
  Target,
  User,
  Users,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { usePermissions } from "@/hooks/usePermissions";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  searchGlobal,
  type SearchLeadResult,
  type SearchUserResult,
} from "@/services/search-api";
import type { PermissionModule } from "@/lib/permissions";

interface SearchModule {
  id: string;
  title: string;
  href: string;
  module: PermissionModule;
  icon: typeof LayoutDashboard;
}

const SEARCH_MODULES: SearchModule[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/dashboard",
    module: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "leads",
    title: "Leads",
    href: "/leads",
    module: "Leads",
    icon: Layers,
  },
  {
    id: "bookings",
    title: "Bookings",
    href: "/bookings",
    module: "Bookings",
    icon: CalendarCheck,
  },
  {
    id: "calendar",
    title: "Calendar",
    href: "/calendar",
    module: "Calendar",
    icon: Calendar,
  },
  {
    id: "users",
    title: "Users",
    href: "/users",
    module: "Users",
    icon: Users,
  },
];

type FlatItem =
  | { kind: "module"; item: SearchModule }
  | { kind: "lead"; item: SearchLeadResult }
  | { kind: "user"; item: SearchUserResult };

export function GlobalSearch() {
  const navigate = useNavigate();
  const { canView } = usePermissions();
  const containerRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<SearchLeadResult[]>([]);
  const [users, setUsers] = useState<SearchUserResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const debouncedQuery = useDebounce(searchQuery, 600);

  const modules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SEARCH_MODULES.filter((mod) => {
      if (!canView(mod.module)) return false;
      if (!q) return false;
      return mod.title.toLowerCase().includes(q);
    });
  }, [searchQuery, canView]);

  const closeAndClear = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setLeads([]);
    setUsers([]);
    setActiveIndex(0);
  }, []);

  useOnClickOutside(containerRef, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setLeads([]);
      setUsers([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void searchGlobal(q)
      .then((response) => {
        if (cancelled) return;
        setLeads(response.data.leads ?? []);
        setUsers(response.data.users ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setLeads([]);
        setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const flatItems = useMemo<FlatItem[]>(() => {
    return [
      ...modules.map((item) => ({ kind: "module" as const, item })),
      ...leads.map((item) => ({ kind: "lead" as const, item })),
      ...users.map((item) => ({ kind: "user" as const, item })),
    ];
  }, [modules, leads, users]);

  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems.length, searchQuery]);

  const activateItem = useCallback(
    (entry: FlatItem) => {
      if (entry.kind === "module") {
        navigate(entry.item.href);
      } else if (entry.kind === "lead") {
        navigate(`/leads?search=${encodeURIComponent(entry.item.name)}`);
      } else {
        navigate(`/users/${entry.item._id}`);
      }
      closeAndClear();
    },
    [navigate, closeAndClear]
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
      return;
    }

    if (!isOpen || flatItems.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = flatItems[activeIndex];
      if (selected) activateItem(selected);
    }
  }

  const showDropdown =
    isOpen &&
    searchQuery.trim().length > 0 &&
    (isLoading ||
      modules.length > 0 ||
      leads.length > 0 ||
      users.length > 0 ||
      debouncedQuery.trim().length >= 2);

  const emptyAfterSearch =
    !isLoading &&
    debouncedQuery.trim().length >= 2 &&
    modules.length === 0 &&
    leads.length === 0 &&
    users.length === 0;

  let runningIndex = -1;

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-foreground/45 dark:text-white/55" />
      <Input
        type="search"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-8 w-48 rounded-full pl-8 lg:w-64",
          // Frosted glass field — overrides solid/opaque Input defaults on the glass header
          "border-white/35 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur-md",
          "placeholder:text-muted-foreground/70",
          "focus-visible:border-white/55 focus-visible:bg-white/35 focus-visible:ring-2 focus-visible:ring-violet-400/25",
          "dark:border-white/20 dark:bg-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.25)]",
          "dark:placeholder:text-white/45 dark:focus-visible:border-white/35 dark:focus-visible:bg-white/15 dark:focus-visible:ring-violet-400/20"
        )}
        autoComplete="off"
        aria-expanded={showDropdown}
        aria-controls="global-search-results"
      />

      {showDropdown ? (
        <div
          id="global-search-results"
          className="absolute top-full right-0 z-50 mt-2 max-h-96 w-[min(24rem,calc(100vw-2rem))] min-w-[20rem] overflow-y-auto rounded-xl border border-white/25 bg-white/85 text-foreground shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/85 dark:text-white dark:shadow-2xl"
          role="listbox"
        >
          <div className="space-y-3 p-3">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-foreground/10 dark:bg-white/10" />
                <div className="h-9 animate-pulse rounded-lg bg-foreground/10 dark:bg-white/10" />
                <div className="h-9 animate-pulse rounded-lg bg-foreground/10 dark:bg-white/10" />
              </div>
            ) : null}

            {emptyAfterSearch ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground dark:text-gray-400">
                No results found
              </p>
            ) : null}

            {modules.length > 0 ? (
              <section>
                <h4 className="mb-2 border-b border-violet-400/40 pb-1 text-xs uppercase tracking-wide text-muted-foreground dark:border-yellow-500/50 dark:text-gray-400">
                  Modules
                </h4>
                <ul className="space-y-0.5">
                  {modules.map((mod) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const Icon = mod.icon;
                    return (
                      <li key={mod.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={activeIndex === index}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/50 dark:hover:bg-white/10",
                            activeIndex === index && "bg-white/55 dark:bg-white/10"
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() =>
                            activateItem({ kind: "module", item: mod })
                          }
                        >
                          <Icon className="size-4 shrink-0 text-violet-500 dark:text-yellow-400" />
                          <span className="text-sm font-medium">{mod.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {leads.length > 0 ? (
              <section>
                <h4 className="mb-2 border-b border-violet-400/40 pb-1 text-xs uppercase tracking-wide text-muted-foreground dark:border-yellow-500/50 dark:text-gray-400">
                  Leads
                </h4>
                <ul className="space-y-0.5">
                  {leads.map((lead) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    return (
                      <li key={lead._id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={activeIndex === index}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/50 dark:hover:bg-white/10",
                            activeIndex === index && "bg-white/55 dark:bg-white/10"
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() =>
                            activateItem({ kind: "lead", item: lead })
                          }
                        >
                          <Target className="size-4 shrink-0 text-sky-500 dark:text-sky-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {lead.name}
                            </span>
                            {lead.contact || lead.email ? (
                              <span className="block truncate text-xs text-muted-foreground dark:text-gray-400">
                                {lead.contact || lead.email}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {users.length > 0 ? (
              <section>
                <h4 className="mb-2 border-b border-violet-400/40 pb-1 text-xs uppercase tracking-wide text-muted-foreground dark:border-yellow-500/50 dark:text-gray-400">
                  Users
                </h4>
                <ul className="space-y-0.5">
                  {users.map((user) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const name =
                      `${user.first_name} ${user.last_name}`.trim() ||
                      user.email;
                    return (
                      <li key={user._id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={activeIndex === index}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/50 dark:hover:bg-white/10",
                            activeIndex === index && "bg-white/55 dark:bg-white/10"
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() =>
                            activateItem({ kind: "user", item: user })
                          }
                        >
                          <User className="size-4 shrink-0 text-violet-500 dark:text-violet-300" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {name}
                            </span>
                            {user.email ? (
                              <span className="block truncate text-xs text-muted-foreground dark:text-gray-400">
                                {user.email}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GlobalSearch;
