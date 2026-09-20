import { createFileRoute } from "@tanstack/react-router";
import { ReportsView } from "#/components/views/reports/ReportsView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/reports")({
  component: ReportsRoute,
});

function ReportsRoute() {
  return <ReportsView />;
}
