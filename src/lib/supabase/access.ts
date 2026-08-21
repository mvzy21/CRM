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
    .select("role, org_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { ok: false, message: "Not authenticated." };

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
