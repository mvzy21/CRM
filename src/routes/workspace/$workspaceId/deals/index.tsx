import { createFileRoute } from "@tanstack/react-router";
import { DealsView } from "#/components/views/deals/DealsView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/deals/")({
  component: DealsRoute,
});

function DealsRoute() {
  const { workspaceId } = Route.useParams();
  return <DealsView workspaceId={workspaceId} />;
}
