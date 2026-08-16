import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env.ts";

/**
 * Service-role client — bypasses RLS entirely. Only ever import this inside
 * a server function that has already verified the caller is an admin
 * (see users.ts). Never send this client or its key to the browser.
 */
export function createAdminSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .dev.vars locally, or " +
        "`wrangler secret put SUPABASE_SERVICE_ROLE_KEY` for deployed environments.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
