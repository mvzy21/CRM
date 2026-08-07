import { createFileRoute } from "@tanstack/react-router";
import { AuthView } from "#/components/views/auth/AuthView.tsx";

interface AuthSearch {
	redirect?: string;
}

export const Route = createFileRoute("/auth")({
	validateSearch: (search: Record<string, unknown>): AuthSearch => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
	component: AuthRoute,
});

function AuthRoute() {
	const { redirect } = Route.useSearch();
	return <AuthView redirect={redirect} />;
}
