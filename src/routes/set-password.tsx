import { createFileRoute, redirect } from "@tanstack/react-router";
import { SetPasswordView } from "#/components/views/auth/SetPasswordView.tsx";
import { getServerUser } from "#/lib/supabase/auth.ts";

export const Route = createFileRoute("/set-password")({
  beforeLoad: async () => {
    const user = await getServerUser();
    if (!user) throw redirect({ to: "/auth" });
  },
  component: SetPasswordView,
});
