import { createFileRoute, redirect } from "@tanstack/react-router";
import { WorkspaceShell } from "#/components/views/workspace/WorkspaceShell.tsx";
import { supabase } from "#/lib/supabase.ts";

export const Route = createFileRoute("/workspace/$workspaceId")({
	ssr: false,
	beforeLoad: async ({ location }) => {
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			throw redirect({ to: "/auth", search: { redirect: location.href } });
		}
	},
	component: WorkspaceLayout,
});

function WorkspaceLayout() {
	const { workspaceId } = Route.useParams();
	return <WorkspaceShell workspaceId={workspaceId} />;
}
