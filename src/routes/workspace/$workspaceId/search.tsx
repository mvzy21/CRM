import { createFileRoute } from "@tanstack/react-router";
import { SearchView } from "#/components/views/search/SearchView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/search")({
  component: SearchRoute,
});

function SearchRoute() {
  const { workspaceId } = Route.useParams();
  return <SearchView workspaceId={workspaceId} />;
}
