import { createFileRoute, redirect } from "@tanstack/react-router";
import { SetPasswordView } from "#/components/views/auth/SetPasswordView.tsx";
import { getServerUser } from "#/lib/supabase/auth.ts";

interface SetPasswordSearch {
  mode?: "invite" | "reset";
}

export const Route = createFileRoute("/set-password")({
  validateSearch: (search: Record<string, unknown>): SetPasswordSearch => ({
    mode: search.mode === "reset" ? "reset" : undefined,
  }),
  beforeLoad: async () => {
    const user = await getServerUser();
    if (!user) throw redirect({ to: "/auth" });
  },
  component: SetPasswordRoute,
});

function SetPasswordRoute() {
  const { mode } = Route.useSearch();
  return <SetPasswordView mode={mode ?? "invite"} />;
}
