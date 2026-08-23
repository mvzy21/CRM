import { createFileRoute } from "@tanstack/react-router";
import { AuthView } from "#/components/views/auth/AuthView.tsx";

interface AuthSearch {
  redirect?: string;
  error?: string;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: AuthRoute,
});

function AuthRoute() {
  const { redirect, error } = Route.useSearch();
  return <AuthView redirect={redirect} error={error} />;
}
