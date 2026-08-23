import { createFileRoute, redirect } from "@tanstack/react-router";
import { WorkspaceShell } from "#/components/views/workspace/WorkspaceShell.tsx";
import { getServerProfile } from "#/lib/supabase/auth.ts";

export const Route = createFileRoute("/workspace/$workspaceId")({
  beforeLoad: async ({ location }) => {
    const profile = await getServerProfile();

    if (!profile) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }

    return { profile };
  },
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { workspaceId } = Route.useParams();
  const { profile } = Route.useRouteContext();
  return (
    <WorkspaceShell
      workspaceId={workspaceId}
      isAdmin={profile?.role === "admin"}
    />
  );
}
