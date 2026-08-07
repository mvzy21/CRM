import { createMiddleware } from "@tanstack/react-start";

/**
 * The browser never talks to Supabase directly (see src/lib/supabase/server.ts) —
 * all auth calls go through same-origin server functions. So connect-src only
 * ever needs 'self'; tightening this later requires re-adding the Supabase host.
 */
const CSP = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data:",
	"font-src 'self' data:",
	"connect-src 'self'",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"object-src 'none'",
].join("; ");

export const securityHeadersMiddleware = createMiddleware({ type: "request" }).server(
	async ({ next }) => {
		const result = await next();

		result.response.headers.set("Content-Security-Policy", CSP);
		result.response.headers.set("X-Frame-Options", "DENY");
		result.response.headers.set("X-Content-Type-Options", "nosniff");
		result.response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		result.response.headers.set(
			"Permissions-Policy",
			"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
		);
		result.response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
		result.response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
		result.response.headers.set(
			"Strict-Transport-Security",
			"max-age=31536000; includeSubDomains",
		);

		return result;
	},
);
