import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

/**
 * Stateless anon-key client, no cookies, no session. `@supabase/ssr`'s
 * server client hard-codes `flowType: "pkce"` with no way to override it --
 * fine for sign-in, but wrong for one-time email links like password reset,
 * since it means the link only works back in the same browser session that
 * requested it (the code exchange needs a code_verifier cookie set on that
 * request). This client keeps the default `flowType: "implicit"`, which is
 * what the invite flow already relies on, so the email link is a
 * self-contained token that works from any device, browser, or mail client.
 */
export function createEmailLinkSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
