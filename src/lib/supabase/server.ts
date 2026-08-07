import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import { supabaseAnonKey, supabaseUrl } from "./env.ts";

/**
 * Server-only Supabase client backed by httpOnly cookies. Never expose this
 * to the browser bundle — auth mutations must go through server functions so
 * the session tokens are only ever readable by the server, not page JS.
 */
export function createServerSupabaseClient() {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll() {
        const cookies = getCookies();
        return Object.entries(cookies).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, options);
        }
      },
    },
  });
}
