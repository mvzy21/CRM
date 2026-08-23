import { createFileRoute, redirect } from "@tanstack/react-router";
import { TeamView } from "#/components/views/team/TeamView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/team")({
  beforeLoad: ({ context, params }) => {
    if (context.profile.role !== "admin") {
      throw redirect({ to: "/workspace/$workspaceId", params });
    }
  },
  component: TeamRoute,
});

function TeamRoute() {
  const { profile } = Route.useRouteContext();
  return <TeamView currentUserId={profile.id} />;
}
