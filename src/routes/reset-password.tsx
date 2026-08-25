import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  establishSessionFromTokens,
  verifyEmailToken,
} from "#/lib/supabase/auth.ts";

interface ResetSearch {
  token_hash?: string;
  type?: string;
  error_description?: string;
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    token_hash:
      typeof search.token_hash === "string" ? search.token_hash : undefined,
    type: typeof search.type === "string" ? search.type : undefined,
    error_description:
      typeof search.error_description === "string"
        ? search.error_description
        : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (search.error_description) {
      throw redirect({ to: "/auth", search: { error: "reset_expired" } });
    }

    // Taken only if the recovery email template was customized to link with
    // ?token_hash=...&type=recovery. Supabase's default template instead
    // lands here with the tokens in the URL hash, which the server never
    // sees -- the component below handles that case.
    if (search.token_hash && search.type === "recovery") {
      const result = await verifyEmailToken({
        data: { tokenHash: search.token_hash, type: "recovery" },
      });
      throw redirect(
        result.success
          ? { to: "/set-password", search: { mode: "reset" } }
          : { to: "/auth", search: { error: "reset_expired" } },
      );
    }
  },
  component: ResetCallback,
});

function ResetCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    // An expired or already-used link comes back as an error in the hash
    // rather than as tokens.
    if (params.get("error")) {
      navigate({ to: "/auth", search: { error: "reset_expired" } });
      return;
    }

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
            ? { to: "/set-password", search: { mode: "reset" } }
            : { to: "/auth", search: { error: "reset_expired" } },
        );
      },
    );
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-[var(--ink-soft)]">
        Verifying your reset link...
      </p>
    </main>
  );
}
