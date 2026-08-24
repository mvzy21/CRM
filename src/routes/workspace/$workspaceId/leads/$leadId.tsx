import { createFileRoute } from "@tanstack/react-router";
import { LeadDetailView } from "#/components/views/leads/LeadDetailView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/leads/$leadId")({
  component: LeadDetailRoute,
});

function LeadDetailRoute() {
  const { profile } = Route.useRouteContext();
  const { workspaceId, leadId } = Route.useParams();
  return (
    <LeadDetailView
      workspaceId={workspaceId}
      leadId={leadId}
      currentUserId={profile.id}
      currentUserRole={profile.role}
      isAdmin={profile.role === "admin"}
    />
  );
}
