import { createFileRoute, redirect } from "@tanstack/react-router";
import { ContactsView } from "#/components/views/contacts/ContactsView.tsx";
import { getServerProfile } from "#/lib/supabase/auth.ts";

export const Route = createFileRoute("/workspace/$workspaceId/contacts")({
  beforeLoad: async () => {
    const profile = await getServerProfile();
    if (!profile) throw redirect({ to: "/auth" });
    return { profile };
  },
  component: ContactsRoute,
});

function ContactsRoute() {
  const { profile } = Route.useRouteContext();
  return (
    <ContactsView
      currentUserId={profile.id}
      isAdmin={profile.role === "admin"}
      canCreate={profile.role === "sales_rep"}
    />
  );
}
