import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import ThemeToggle from "#/components/ThemeToggle.tsx";
import { Button } from "#/components/ui/button.tsx";

const links = [
	{ label: "Features", href: "#features" },
	{ label: "Pipeline", href: "#pipeline" },
];

export function Nav() {
	return (
		<motion.header
			initial={{ opacity: 0, y: -16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
			className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg"
		>
			<nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-4">
				<Link
					to="/"
					className="inline-flex flex-shrink-0 items-center gap-2 text-base font-semibold text-[var(--ink)] no-underline"
				>
					<span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
					Altrium
				</Link>

				<div className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-1 pb-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-nowrap sm:pb-0">
					{links.map((link) => (
						<a key={link.href} href={link.href} className="nav-link">
							{link.label}
						</a>
					))}
				</div>

				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
					<Button asChild size="sm" variant="ghost">
						<Link to="/auth">Sign in</Link>
					</Button>
					<Button asChild size="sm">
						<Link to="/auth">Get started</Link>
					</Button>
				</div>
			</nav>
		</motion.header>
	);
}
