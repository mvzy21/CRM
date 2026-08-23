import { createFileRoute } from "@tanstack/react-router";
import { LeadsView } from "#/components/views/leads/LeadsView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/leads/")({
  component: LeadsRoute,
});

function LeadsRoute() {
  const { profile } = Route.useRouteContext();
  const { workspaceId } = Route.useParams();
  return (
    <LeadsView
      workspaceId={workspaceId}
      currentUserId={profile.id}
      canCreate={profile.role === "sales_rep"}
    />
  );
}
