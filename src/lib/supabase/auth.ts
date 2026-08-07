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
