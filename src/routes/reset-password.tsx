import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  establishSessionFromTokens,
  exchangeAuthCode,
  verifyEmailToken,
} from "#/lib/supabase/auth.ts";

interface ResetSearch {
  code?: string;
  token_hash?: string;
  type?: string;
  error_description?: string;
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
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

    // The actual case in production: our server-issued reset email uses the
    // PKCE flow (the @supabase/ssr client's default), so the link lands here
    // with `?code=`. Exchanging it needs the code_verifier cookie set on this
    // same browser when the reset was requested.
    if (search.code) {
      const result = await exchangeAuthCode({ data: { code: search.code } });
      throw redirect(
        result.success
          ? { to: "/set-password", search: { mode: "reset" } }
          : { to: "/auth", search: { error: "reset_expired" } },
      );
    }

    // Only taken if the recovery email template was customized to link with
    // ?token_hash=...&type=recovery instead of the PKCE default above.
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
    // rather than as tokens. Only reached if neither `?code=` nor
    // `?token_hash=` was present -- i.e. a legacy implicit-flow link.
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
