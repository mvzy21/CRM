import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import ThemeToggle from "#/components/ThemeToggle.tsx";
import { Button } from "#/components/ui/button.tsx";

const links = [
	{ label: "Features", href: "#features" },
	{ label: "Workflow", href: "#workflow" },
];

export function Nav() {
	return (
		<motion.header
			initial={{ opacity: 0, y: -16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
			className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg"
		>
			<nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
				<Link
					to="/"
					className="inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
				>
					<span className="h-2 w-2 rounded-full bg-[#fbb401]" />
					Altrium
				</Link>

				<div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-nowrap sm:pb-0">
					{links.map((link) => (
						<a key={link.href} href={link.href} className="nav-link">
							{link.label}
						</a>
					))}
				</div>

				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
					<Button asChild size="sm">
						<Link to="/auth">Sign in</Link>
					</Button>
				</div>
			</nav>
		</motion.header>
	);
}
