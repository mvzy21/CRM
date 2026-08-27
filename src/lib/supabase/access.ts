import type { AppRole } from "./roles.ts";
import { createServerSupabaseClient } from "./server.ts";

type AuthCheck =
  | {
      ok: true;
      supabase: ReturnType<typeof createServerSupabaseClient>;
      userId: string;
      role: AppRole;
      orgId: string;
    }
  | { ok: false; message: string };

export async function requireAuth(): Promise<AuthCheck> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) return { ok: false, message: "Not authenticated." };

  if (!profile.is_active) {
    // Deactivating a user (US-22) only flips a column -- it doesn't revoke
    // an already-issued session token. Without this check, a deactivated
    // user keeps full access through every server function until they
    // happen to sign out. Sign them out here so the next request/redirect
    // actually lands them back at the login screen.
    await supabase.auth.signOut();
    return {
      ok: false,
      message: "This account has been deactivated. Contact your administrator.",
    };
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
    role: profile.role,
    orgId: profile.org_id,
  };
}

export async function requireRole(allowedRoles: AppRole[]): Promise<AuthCheck> {
  const check = await requireAuth();
  if (!check.ok) return check;

  if (!allowedRoles.includes(check.role)) {
    return {
      ok: false,
      message: `Only ${allowedRoles.join(" or ")} can do this.`,
    };
  }

  return check;
}
