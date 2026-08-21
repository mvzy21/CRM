import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAdminSupabaseClient } from "./admin.ts";
import { type AppRole, appRoleSchema } from "./roles.ts";
import { createServerSupabaseClient } from "./server.ts";

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string | null;
  role: AppRole;
  teamId: string | null;
  teamName: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
}

type ActionResult = { success: true } | { success: false; message: string };

/**
 * Every mutation below re-checks the caller's role from `profiles` even
 * though RLS enforces the same rule at the database layer — this gives
 * callers a clear "Only admins can..." message instead of a raw
 * RLS-denial error, and fails closed if the check is ever skipped.
 */
async function requireAdmin() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, message: "Not authenticated." };
  }

  const { data: caller } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single();

  if (!caller || caller.role !== "admin") {
    return { ok: false as const, message: "Only admins can manage users." };
  }

  return {
    ok: true as const,
    supabase,
    callerId: user.id,
    orgId: caller.org_id,
  };
}

export const listUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    | { success: true; users: ManagedUser[] }
    | { success: false; message: string }
  > => {
    const check = await requireAdmin();
    if (!check.ok) return { success: false, message: check.message };

    const [
      { data: profiles, error: profilesError },
      { data: teams, error: teamsError },
    ] = await Promise.all([
      check.supabase
        .from("profiles")
        .select("id, email, display_name, role, team_id, is_active, created_at")
        .order("created_at", { ascending: true }),
      check.supabase.from("teams").select("id, name"),
    ]);

    if (profilesError || teamsError) {
      return { success: false, message: "Failed to load users." };
    }

    const teamNameById = new Map(teams.map((team) => [team.id, team.name]));

    const users: ManagedUser[] = profiles.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      teamId: row.team_id,
      teamName: row.team_id ? (teamNameById.get(row.team_id) ?? null) : null,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));

    return { success: true, users };
  },
);

export const listTeams = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    { success: true; teams: Team[] } | { success: false; message: string }
  > => {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated." };

    const { data, error } = await supabase
      .from("teams")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) return { success: false, message: "Failed to load teams." };
    return { success: true, teams: data };
  },
);

const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(80),
});

export const createTeam = createServerFn({ method: "POST" })
  .validator(createTeamSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAdmin();
    if (!check.ok) return { success: false, message: check.message };

    const { error } = await check.supabase
      .from("teams")
      .insert({ name: data.name, org_id: check.orgId });

    if (error) return { success: false, message: "Failed to create team." };
    return { success: true };
  });

const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: appRoleSchema,
  teamId: z.string().uuid().nullable(),
});

export const inviteUser = createServerFn({ method: "POST" })
  .validator(inviteUserSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAdmin();
    if (!check.ok) return { success: false, message: check.message };

    const admin = createAdminSupabaseClient();
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(data.email);

    if (inviteError || !invited.user) {
      return {
        success: false,
        message: inviteError?.message ?? "Failed to send invite.",
      };
    }

    const { error: insertError } = await admin.from("profiles").insert({
      id: invited.user.id,
      org_id: check.orgId,
      team_id: data.teamId,
      role: data.role,
      email: data.email,
      invited_by: check.callerId,
    });

    if (insertError) {
      // Don't leave an auth user with no matching profile — the app treats
      // that as a broken account and login checks would misbehave.
      await admin.auth.admin.deleteUser(invited.user.id);
      return { success: false, message: "Failed to create the user record." };
    }

    return { success: true };
  });

const resendInviteSchema = z.object({
  userId: z.string().uuid(),
});

export const resendInvite = createServerFn({ method: "POST" })
  .validator(resendInviteSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAdmin();
    if (!check.ok) return { success: false, message: check.message };

    const { data: profile } = await check.supabase
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .single();

    if (!profile) return { success: false, message: "User not found." };

    const admin = createAdminSupabaseClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(profile.email);

    if (error) {
      // Supabase rejects this once the user has already accepted an invite.
      return {
        success: false,
        message: error.message.includes("already been registered")
          ? "This user has already accepted their invite."
          : "Failed to resend invite.",
      };
    }

    return { success: true };
  });

const deleteUserSchema = z.object({
  userId: z.string().uuid(),
});

export const deleteUser = createServerFn({ method: "POST" })
  .validator(deleteUserSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAdmin();
    if (!check.ok) return { success: false, message: check.message };

    if (data.userId === check.callerId) {
      return {
        success: false,
        message: "You can't delete your own account.",
      };
    }

    const admin = createAdminSupabaseClient();
    // profiles.id -> auth.users(id) on delete cascade, so this removes the
    // profile row too.
    const { error } = await admin.auth.admin.deleteUser(data.userId);

    if (error) return { success: false, message: "Failed to delete user." };
    return { success: true };
  });

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  role: appRoleSchema,
  teamId: z.string().uuid().nullable(),
});

export const updateUser = createServerFn({ method: "POST" })
  .validator(updateUserSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAdmin();
    if (!check.ok) return { success: false, message: check.message };

    const { error } = await check.supabase
      .from("profiles")
      .update({ role: data.role, team_id: data.teamId })
      .eq("id", data.userId);

    if (error) return { success: false, message: "Failed to update user." };
    return { success: true };
  });

const setUserActiveSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
});

export const setUserActive = createServerFn({ method: "POST" })
  .validator(setUserActiveSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAdmin();
    if (!check.ok) return { success: false, message: check.message };

    if (data.userId === check.callerId && !data.isActive) {
      return {
        success: false,
        message: "You can't deactivate your own account.",
      };
    }

    const { error } = await check.supabase
      .from("profiles")
      .update({ is_active: data.isActive })
      .eq("id", data.userId);

    if (error) return { success: false, message: "Failed to update user." };
    return { success: true };
  });
