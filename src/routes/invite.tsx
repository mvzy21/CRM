import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { establishSessionFromTokens, verifyInvite } from "#/lib/supabase/auth.ts";

interface InviteSearch {
  token_hash?: string;
  type?: string;
}

export const Route = createFileRoute("/invite")({
  validateSearch: (search: Record<string, unknown>): InviteSearch => ({
    token_hash: typeof search.token_hash === "string" ? search.token_hash : undefined,
    type: typeof search.type === "string" ? search.type : undefined,
  }),
  beforeLoad: async ({ search }) => {
    // Only taken if the email template was customized to link with
    // ?token_hash=...&type=invite. Supabase's default template instead
    // redirects here with tokens in the URL hash, which only the
    // client-side component below can read.
    if (search.token_hash && search.type === "invite") {
      const result = await verifyInvite({ data: { tokenHash: search.token_hash } });
      throw redirect(
        result.success
          ? { to: "/set-password" }
          : { to: "/auth", search: { error: "invite_expired" } },
      );
    }
  },
  component: InviteCallback,
});

function InviteCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      navigate({ to: "/auth", search: { error: "invalid_link" } });
      return;
    }

    establishSessionFromTokens({ data: { accessToken, refreshToken } }).then(
      (result) => {
        navigate(
          result.success
            ? { to: "/set-password" }
            : { to: "/auth", search: { error: "invite_expired" } },
        );
      },
    );
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-[var(--ink-soft)]">Confirming your invite...</p>
    </main>
  );
}
