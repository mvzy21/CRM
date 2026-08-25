import { createFileRoute } from "@tanstack/react-router";
import { DealDetailView } from "#/components/views/deals/DealDetailView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/deals/$dealId")({
  component: DealDetailRoute,
});

function DealDetailRoute() {
  const { profile } = Route.useRouteContext();
  const { workspaceId, dealId } = Route.useParams();
  return (
    <DealDetailView
      workspaceId={workspaceId}
      dealId={dealId}
      currentUserId={profile.id}
      isAdmin={profile.role === "admin"}
      isSalesManager={profile.role === "sales_manager"}
    />
  );
}
