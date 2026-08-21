import { createFileRoute, redirect } from "@tanstack/react-router";
import { getServerUser } from "#/lib/supabase/auth.ts";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const user = await getServerUser();
    throw redirect({ to: user ? "/workspace" : "/auth" });
  },
});
