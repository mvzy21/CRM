import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createServerSupabaseClient } from "./server.ts";

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
      .select("role, display_name, team_id")
      .eq("id", user.id)
      .single();

    if (!profile) return null;

    return {
      id: user.id,
      email: user.email ?? null,
      role: profile.role,
      displayName: profile.display_name,
      teamId: profile.team_id,
    };
  },
);
