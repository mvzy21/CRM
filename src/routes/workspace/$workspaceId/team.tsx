import { createFileRoute, redirect } from "@tanstack/react-router";
import { TeamView } from "#/components/views/team/TeamView.tsx";
import { getServerProfile } from "#/lib/supabase/auth.ts";

export const Route = createFileRoute("/workspace/$workspaceId/team")({
  beforeLoad: async ({ params }) => {
    const profile = await getServerProfile();

    if (!profile || profile.role !== "admin") {
      throw redirect({ to: "/workspace/$workspaceId", params });
    }

    return { profile };
  },
  component: TeamRoute,
});

function TeamRoute() {
  const { profile } = Route.useRouteContext();
  return <TeamView currentUserId={profile.id} />;
}
