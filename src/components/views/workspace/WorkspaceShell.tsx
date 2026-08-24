import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import ThemeToggle from "#/components/ThemeToggle.tsx";
import { Button } from "#/components/ui/button.tsx";
import { signOut } from "#/lib/supabase/auth.ts";
import { ROLE_LABELS, type AppRole } from "#/lib/supabase/roles.ts";

interface WorkspaceShellProps {
  workspaceId: string;
  isAdmin: boolean;
  userEmail: string | null;
  userRole: AppRole | null;
}

export function WorkspaceShell({
  workspaceId,
  isAdmin,
  userEmail,
  userRole,
}: WorkspaceShellProps) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
        <div className="flex items-center gap-3 py-3">
          <Link
            to="/workspace/$workspaceId"
            params={{ workspaceId }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)]"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            Altrium
          </Link>
          <span className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs font-medium text-[var(--muted-foreground)]">
            {workspaceId}
          </span>

          <Link
            to="/workspace/$workspaceId"
            params={{ workspaceId }}
            className="nav-link text-sm font-medium"
            activeOptions={{ exact: true }}
            activeProps={{ className: "is-active" }}
          >
            Home
          </Link>

          <Link
            to="/workspace/$workspaceId/companies"
            params={{ workspaceId }}
            className="nav-link text-sm font-medium"
            activeProps={{ className: "is-active" }}
          >
            Companies
          </Link>

          <Link
            to="/workspace/$workspaceId/contacts"
            params={{ workspaceId }}
            className="nav-link text-sm font-medium"
            activeProps={{ className: "is-active" }}
          >
            Contacts
          </Link>

          <Link
            to="/workspace/$workspaceId/leads"
            params={{ workspaceId }}
            className="nav-link text-sm font-medium"
            activeProps={{ className: "is-active" }}
          >
            Leads
          </Link>

          <Link
            to="/workspace/$workspaceId/deals"
            params={{ workspaceId }}
            className="nav-link text-sm font-medium"
            activeProps={{ className: "is-active" }}
          >
            Deals
          </Link>

          {isAdmin ? (
            <Link
              to="/workspace/$workspaceId/team"
              params={{ workspaceId }}
              className="nav-link text-sm font-medium"
              activeProps={{ className: "is-active" }}
            >
              Team
            </Link>
          ) : null}

          <div className="ml-auto flex items-center gap-3">
            {userEmail ? (
              <span className="hidden text-sm text-[var(--ink-soft)] sm:inline">
                {userEmail}
                {userRole ? (
                  <span className="ml-1.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2 py-0.5 text-xs font-medium">
                    {ROLE_LABELS[userRole]}
                  </span>
                ) : null}
              </span>
            ) : null}
            <ThemeToggle />
            <Button size="sm" variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="page-wrap px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
