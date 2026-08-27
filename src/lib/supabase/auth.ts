import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  createEmailLinkSupabaseClient,
  createServerSupabaseClient,
} from "./server.ts";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signInWithPassword = createServerFn({ method: "POST" })
  .validator(signInSchema)
  .handler(async ({ data }) => {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      const rateLimited = error.status === 429;
      return {
        success: false as const,
        message: rateLimited
          ? "Too many attempts. Please wait a moment and try again."
          : "Invalid email or password.",
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .single();

      if (profile && !profile.is_active) {
        await supabase.auth.signOut();
        return {
          success: false as const,
          message:
            "This account has been deactivated. Contact your administrator.",
        };
      }
    }

    return { success: true as const };
  });

const verifyEmailTokenSchema = z.object({
  tokenHash: z.string().min(1),
  type: z.enum(["invite", "recovery"]),
});

/**
 * Exchanges a one-time email token for a session. Invites and password
 * recovery are the same handshake with a different `type`, so they share one
 * server function rather than two near-identical ones.
 */
export const verifyEmailToken = createServerFn({ method: "POST" })
  .validator(verifyEmailTokenSchema)
  .handler(async ({ data }) => {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: data.type,
    });

    if (error) {
      return {
        success: false as const,
        message: "This link is invalid or has expired.",
      };
    }

    return { success: true as const };
  });

const exchangeAuthCodeSchema = z.object({
  code: z.string().min(1),
});

/**
 * Completes a PKCE code exchange. The server Supabase client
 * (`@supabase/ssr`) defaults to `flowType: "pkce"`, so any email link
 * generated from a server-issued request -- like our password reset --
 * carries a `?code=` param rather than the `token_hash` the admin client's
 * invite emails use. Exchanging it needs the code_verifier cookie that was
 * set on this same browser when the reset was requested.
 */
export const exchangeAuthCode = createServerFn({ method: "POST" })
  .validator(exchangeAuthCodeSchema)
  .handler(async ({ data }) => {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(data.code);

    if (error) {
      return {
        success: false as const,
        message: "This link is invalid or has expired.",
      };
    }

    return { success: true as const };
  });

const establishSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const establishSessionFromTokens = createServerFn({ method: "POST" })
  .validator(establishSessionSchema)
  .handler(async ({ data }) => {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });

    if (error) {
      return {
        success: false as const,
        message: "This link is invalid or has expired.",
      };
    }

    return { success: true as const };
  });

const setPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const setPassword = createServerFn({ method: "POST" })
  .validator(setPasswordSchema)
  .handler(async ({ data }) => {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false as const,
        message:
          "Your session has expired. Please use the link from your email again.",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      return { success: false as const, message: "Failed to set password." };
    }

    return { success: true as const };
  });

const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254),
});

function resetRedirectUrl() {
  const request = getRequest();
  return `${new URL(request.url).origin}/reset-password`;
}

/**
 * Sends a recovery email. Reports success identically whether or not the
 * address has an account -- a "no such user" response would turn this form
 * into an account-enumeration oracle. Rate limiting is the one failure worth
 * surfacing, since otherwise the user waits on an email that was never sent.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(requestPasswordResetSchema)
  .handler(async ({ data }) => {
    const supabase = createEmailLinkSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: resetRedirectUrl(),
    });

    if (error?.status === 429) {
      return {
        success: false as const,
        message: "Too many requests. Please wait a moment and try again.",
      };
    }

    return { success: true as const };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  return { success: true as const };
});

export const getServerUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },
);

export const getServerProfile = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name, team_id, is_active")
      .eq("id", user.id)
      .single();

    if (!profile) return null;

    if (!profile.is_active) {
      // Mirrors the check in requireAuth() (access.ts) -- a deactivated
      // user's existing session is otherwise still valid, so this is what
      // actually kicks them out of the workspace on their next navigation.
      await supabase.auth.signOut();
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
      role: profile.role,
      displayName: profile.display_name,
      teamId: profile.team_id,
    };
  },
);
