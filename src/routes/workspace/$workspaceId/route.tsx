import { createFileRoute, redirect } from "@tanstack/react-router";
import { WorkspaceShell } from "#/components/views/workspace/WorkspaceShell.tsx";
import { getServerProfile, getServerUser } from "#/lib/supabase/auth.ts";

export const Route = createFileRoute("/workspace/$workspaceId")({
  beforeLoad: async ({ location }) => {
    const user = await getServerUser();

    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }

    const profile = await getServerProfile();
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
