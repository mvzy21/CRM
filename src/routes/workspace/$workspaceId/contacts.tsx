import { createFileRoute } from "@tanstack/react-router";
import { ContactsView } from "#/components/views/contacts/ContactsView.tsx";

export const Route = createFileRoute("/workspace/$workspaceId/contacts")({
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
