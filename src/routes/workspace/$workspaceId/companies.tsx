import { createFileRoute } from "@tanstack/react-router";
import { CompaniesView } from "#/components/views/companies/CompaniesView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/companies")({
  component: CompaniesRoute,
});

function CompaniesRoute() {
  const { profile } = Route.useRouteContext();
  return (
    <CompaniesView
      currentUserId={profile.id}
      isAdmin={profile.role === "admin"}
      canCreate={profile.role === "sales_rep"}
    />
  );
}
