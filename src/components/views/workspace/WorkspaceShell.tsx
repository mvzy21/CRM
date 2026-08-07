import { Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import ThemeToggle from "#/components/ThemeToggle.tsx";
import { Button } from "#/components/ui/button.tsx";
import { signOut } from "#/lib/supabase/auth.ts";

interface WorkspaceShellProps {
  workspaceId: string;
}

export function WorkspaceShell({ workspaceId }: WorkspaceShellProps) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
        <div className="flex items-center gap-3 py-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)]">
            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            Altrium
          </span>
          <span className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs font-medium text-[var(--muted-foreground)]">
            {workspaceId}
          </span>

          <div className="ml-auto flex items-center gap-2">
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
