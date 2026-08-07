import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { securityHeadersMiddleware } from "#/lib/security/headers-middleware.ts";

/**
 * Server functions are same-origin RPC endpoints (sign-in, sign-out, session
 * check). This rejects any request whose Sec-Fetch-Site/Origin/Referer says
 * it came from another site, with a plain 403 — a forged cross-site POST to
 * /signInWithPassword or /signOut gets refused before it ever touches
 * Supabase. Page navigations (handlerType: 'router') are left alone so
 * external links to the site still work.
 */
const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware, securityHeadersMiddleware],
}));
