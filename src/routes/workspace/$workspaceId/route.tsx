import { createFileRoute, redirect } from "@tanstack/react-router";
import { WorkspaceShell } from "#/components/views/workspace/WorkspaceShell.tsx";
import { getServerUser } from "#/lib/supabase/auth.ts";

export const Route = createFileRoute("/workspace/$workspaceId")({
	beforeLoad: async ({ location }) => {
		const user = await getServerUser();

		if (!user) {
			throw redirect({ to: "/auth", search: { redirect: location.href } });
		}
	},
	component: WorkspaceLayout,
});

function WorkspaceLayout() {
	const { workspaceId } = Route.useParams();
	return <WorkspaceShell workspaceId={workspaceId} />;
}
