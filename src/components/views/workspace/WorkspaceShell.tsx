import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  Building2,
  Contact,
  Flame,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import ThemeToggle from "#/components/ThemeToggle.tsx";
import { Button } from "#/components/ui/button.tsx";
import { signOut } from "#/lib/supabase/auth.ts";
import { getRailCounts, type RailCounts } from "#/lib/supabase/overview.ts";
import { type AppRole, ROLE_LABELS } from "#/lib/supabase/roles.ts";

interface WorkspaceShellProps {
  workspaceId: string;
  isAdmin: boolean;
  userEmail: string | null;
  userRole: AppRole | null;
}

/** Three ascending bars -- the pipeline itself, echoing the funnel chart
 *  on the Deals view. Reads as a mark rather than a stock icon. */
function PipelineMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <title>Altrium</title>
      <rect x="2" y="9.5" width="3" height="4.5" rx="1" fill="currentColor" />
      <rect x="6.5" y="6" width="3" height="8" rx="1" fill="currentColor" />
      <rect x="11" y="2" width="3" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

export function WorkspaceShell({
  workspaceId,
  isAdmin,
  userEmail,
  userRole,
}: WorkspaceShellProps) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [counts, setCounts] = useState<RailCounts | null>(null);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close the drawer whenever navigation lands somewhere new.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  // Counts turn the rail into a status readout, not just a router. One
  // authenticated call with head-only count queries -- the rail renders on
  // every page, so it must not fetch whole tables to measure them.
  useEffect(() => {
    getRailCounts().then((r) => r.success && setCounts(r.counts));
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth" });
  }

  const initial = (userEmail?.[0] ?? "?").toUpperCase();

  const railBody = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary)]">
          <PipelineMark className="h-4 w-4 text-[var(--primary-foreground)]" />
        </span>
        <div className="min-w-0">
          <p className="display-title text-[15px] font-bold leading-none text-[var(--rail-ink)]">
            Altrium
          </p>
          <p className="rail-mono mt-1 truncate text-[10px] leading-none text-[var(--rail-ink-faint)]">
            {workspaceId}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="rail-zone px-3 pb-2 pt-3">Pipeline</p>
        <div className="flex flex-col gap-0.5">
          <Link
            to="/workspace/$workspaceId/companies"
            params={{ workspaceId }}
            className="rail-link"
            activeProps={{ className: "rail-link is-active" }}
          >
            <Building2 className="rail-icon h-4 w-4" />
            Companies
            {counts ? (
              <span className="rail-count">{counts.companies}</span>
            ) : null}
          </Link>

          <Link
            to="/workspace/$workspaceId/contacts"
            params={{ workspaceId }}
            className="rail-link"
            activeProps={{ className: "rail-link is-active" }}
          >
            <Contact className="rail-icon h-4 w-4" />
            Contacts
            {counts ? (
              <span className="rail-count">{counts.contacts}</span>
            ) : null}
          </Link>

          <Link
            to="/workspace/$workspaceId/leads"
            params={{ workspaceId }}
            className="rail-link"
            activeProps={{ className: "rail-link is-active" }}
          >
            <Flame className="rail-icon h-4 w-4" />
            Leads
            {counts ? <span className="rail-count">{counts.leads}</span> : null}
          </Link>

          <Link
            to="/workspace/$workspaceId/deals"
            params={{ workspaceId }}
            className="rail-link"
            activeProps={{ className: "rail-link is-active" }}
          >
            <Handshake className="rail-icon h-4 w-4" />
            Deals
            {counts ? <span className="rail-count">{counts.deals}</span> : null}
          </Link>
        </div>

        <p className="rail-zone px-3 pb-2 pt-6">Workspace</p>
        <div className="flex flex-col gap-0.5">
          <Link
            to="/workspace/$workspaceId"
            params={{ workspaceId }}
            className="rail-link"
            activeOptions={{ exact: true }}
            activeProps={{ className: "rail-link is-active" }}
          >
            <LayoutDashboard className="rail-icon h-4 w-4" />
            Overview
          </Link>

          {isAdmin ? (
            <Link
              to="/workspace/$workspaceId/team"
              params={{ workspaceId }}
              className="rail-link"
              activeProps={{ className: "rail-link is-active" }}
            >
              <UsersRound className="rail-icon h-4 w-4" />
              Team
            </Link>
          ) : null}
        </div>
      </nav>

      {/* Role is the most load-bearing state in this app -- every action
          button keys off it -- so identity stays pinned and visible. */}
      <div className="rail-identity px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="rail-avatar">{initial}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-tight text-[var(--rail-ink)]">
              {userEmail ?? "Signed in"}
            </p>
            {userRole ? (
              <span className="rail-role mt-1">{ROLE_LABELS[userRole]}</span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <ThemeToggle variant="rail" />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSignOut}
            className="ml-auto text-[var(--rail-ink-soft)] hover:bg-[var(--rail-bg-soft)] hover:text-[var(--rail-ink)]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Fixed rail, lg and up */}
      <aside className="rail fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col lg:flex">
        {railBody}
      </aside>

      {/* Compact top bar with the burger, below lg */}
      <header className="rail-topbar sticky top-0 z-30 flex items-center gap-3 px-4 py-3 lg:hidden">
        <button
          type="button"
          className="rail-icon-btn"
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--primary)]">
          <PipelineMark className="h-3.5 w-3.5 text-[var(--primary-foreground)]" />
        </span>
        <p className="display-title text-[15px] font-bold text-[var(--rail-ink)]">
          Altrium
        </p>

        {userRole ? (
          <span className="rail-role ml-auto">{ROLE_LABELS[userRole]}</span>
        ) : null}
      </header>

      {/* Slide-over drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="rail-scrim absolute inset-0 h-full w-full"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="rail rail-drawer absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col">
            <button
              type="button"
              className="rail-icon-btn absolute right-3 top-4"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {railBody}
          </aside>
        </div>
      ) : null}

      <main className="px-4 py-10 lg:pl-[260px]">
        <div className="mx-auto w-full max-w-[1080px] lg:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
