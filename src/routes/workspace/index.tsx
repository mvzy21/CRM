import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_WORKSPACE_ID } from "#/lib/workspace.ts";

export const Route = createFileRoute("/workspace/")({
	beforeLoad: () => {
		throw redirect({
			to: "/workspace/$workspaceId",
			params: { workspaceId: DEFAULT_WORKSPACE_ID },
		});
	},
});
