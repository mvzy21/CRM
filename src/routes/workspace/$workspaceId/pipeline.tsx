import { createFileRoute } from "@tanstack/react-router";
import { TeamPipelineView } from "#/components/views/pipeline/TeamPipelineView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/pipeline")({
  component: PipelineRoute,
});

function PipelineRoute() {
  const { workspaceId } = Route.useParams();
  return <TeamPipelineView workspaceId={workspaceId} />;
}
