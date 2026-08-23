import { createFileRoute } from "@tanstack/react-router";
import { LeadsView } from "#/components/views/leads/LeadsView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/leads")({
  component: LeadsRoute,
});

function LeadsRoute() {
  const { profile } = Route.useRouteContext();
  return (
    <LeadsView
      currentUserId={profile.id}
      isAdmin={profile.role === "admin"}
      canCreate={profile.role === "sales_rep"}
    />
  );
}
