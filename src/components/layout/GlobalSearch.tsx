"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Search, User, Building2, FolderKanban, LifeBuoy } from "lucide-react";
import { globalSearch } from "@/lib/actions/global-search";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    users: Array<{ id: string; email: string; name: string | null }>;
    organizations: Array<{ id: string; name: string; slug: string }>;
    projects: Array<{ id: string; name: string; orgName: string }>;
    tickets: Array<{ id: string; ticketNumber: number; subject: string; userEmail: string }>;
  }>({ users: [], organizations: [], projects: [], tickets: [] });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults({ users: [], organizations: [], projects: [], tickets: [] });
      return;
    }
    setIsLoading(true);
    try {
      const data = await globalSearch(term);
      setResults(data);
    } catch (error) {
      console.error("Global search failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 200);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults =
    results.users.length > 0 ||
    results.organizations.length > 0 ||
    results.projects.length > 0 ||
    results.tickets.length > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-slate-400 text-sm hover:bg-slate-800 hover:text-slate-300 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-500 font-mono">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search users, organizations, projects, tickets..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!hasResults && query.trim().length > 0 && !isLoading && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {query.trim().length === 0 && (
            <CommandEmpty>Type to search across the platform...</CommandEmpty>
          )}

          {results.users.length > 0 && (
            <CommandGroup heading="Users">
              {results.users.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => handleSelect(`/users/${user.id}`)}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4 text-slate-500" />
                  <span className="flex-1 truncate">
                    {user.name || user.email}
                  </span>
                  <span className="text-xs text-slate-500 truncate max-w-[180px]">
                    {user.email}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.organizations.length > 0 && (
            <>
              {results.users.length > 0 && <CommandSeparator />}
              <CommandGroup heading="Organizations">
                {results.organizations.map((org) => (
                  <CommandItem
                    key={org.id}
                    onSelect={() => handleSelect(`/organizations/${org.id}`)}
                    className="cursor-pointer"
                  >
                    <Building2 className="mr-2 h-4 w-4 text-slate-500" />
                    <span className="flex-1 truncate">{org.name}</span>
                    <span className="text-xs text-slate-500 font-mono truncate max-w-[180px]">
                      {org.slug}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results.projects.length > 0 && (
            <>
              {(results.users.length > 0 || results.organizations.length > 0) && (
                <CommandSeparator />
              )}
              <CommandGroup heading="Projects">
                {results.projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => handleSelect(`/projects/${project.id}`)}
                    className="cursor-pointer"
                  >
                    <FolderKanban className="mr-2 h-4 w-4 text-slate-500" />
                    <span className="flex-1 truncate">{project.name}</span>
                    <span className="text-xs text-slate-500 truncate max-w-[180px]">
                      {project.orgName}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results.tickets.length > 0 && (
            <>
              {(results.users.length > 0 || results.organizations.length > 0 || results.projects.length > 0) && (
                <CommandSeparator />
              )}
              <CommandGroup heading="Support Tickets">
                {results.tickets.map((ticket) => (
                  <CommandItem
                    key={ticket.id}
                    onSelect={() => handleSelect(`/help-desk/queue`)}
                    className="cursor-pointer"
                  >
                    <LifeBuoy className="mr-2 h-4 w-4 text-slate-500" />
                    <span className="flex-1 truncate">
                      #{ticket.ticketNumber} {ticket.subject}
                    </span>
                    <span className="text-xs text-slate-500 truncate max-w-[180px]">
                      {ticket.userEmail}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
