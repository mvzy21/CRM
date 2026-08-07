import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { MagicLinkForm } from "./MagicLinkForm";
import { PasswordTestSignIn } from "./PasswordTestSignIn";

interface AuthViewProps {
	redirect?: string;
}

export function AuthView({ redirect }: AuthViewProps) {
	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-16">
			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
				className="island-shell w-full max-w-sm rounded-2xl p-8"
			>
				<Link
					to="/"
					className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)] no-underline"
				>
					<span className="h-2 w-2 rounded-full bg-[#fbb401]" />
					Altrium
				</Link>

				<p className="island-kicker mb-2">Sign in</p>
				<h1 className="display-title mb-2 text-2xl font-bold text-[var(--sea-ink)]">
					Welcome back
				</h1>
				<p className="mb-6 text-sm leading-6 text-[var(--sea-ink-soft)]">
					Enter your email and we'll send you a link to sign in
					{redirect ? " and take you back to your workspace" : ""}.
				</p>

				<MagicLinkForm />
				<PasswordTestSignIn redirect={redirect} />
			</motion.div>
		</main>
	);
}
