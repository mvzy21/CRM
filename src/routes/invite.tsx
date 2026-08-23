import { createFileRoute, redirect } from "@tanstack/react-router";
import { verifyInvite } from "#/lib/supabase/auth.ts";

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
    if (!search.token_hash || search.type !== "invite") {
      throw redirect({ to: "/auth", search: { error: "invalid_link" } });
    }

    const result = await verifyInvite({ data: { tokenHash: search.token_hash } });

    if (!result.success) {
      throw redirect({ to: "/auth", search: { error: "invite_expired" } });
    }

    throw redirect({ to: "/set-password" });
  },
  component: () => null,
});
