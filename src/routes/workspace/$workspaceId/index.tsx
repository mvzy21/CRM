import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceView } from "#/components/views/workspace/WorkspaceView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/")({
  component: WorkspaceView,
});
