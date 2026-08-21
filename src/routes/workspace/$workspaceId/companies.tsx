import { createFileRoute, redirect } from "@tanstack/react-router";
import { CompaniesView } from "#/components/views/companies/CompaniesView.tsx";
import { getServerProfile } from "#/lib/supabase/auth.ts";

export const Route = createFileRoute("/workspace/$workspaceId/companies")({
  beforeLoad: async () => {
    const profile = await getServerProfile();
    if (!profile) throw redirect({ to: "/auth" });
    return { profile };
  },
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
