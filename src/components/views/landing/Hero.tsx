import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Button } from "#/components/ui/button.tsx";

const container = {
	hidden: {},
	show: {
		transition: { staggerChildren: 0.12, delayChildren: 0.1 },
	},
};

const item = {
	hidden: { opacity: 0, y: 20 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
	},
};

export function Hero() {
	return (
		<motion.section
			variants={container}
			initial="hidden"
			animate="show"
			className="page-wrap px-4 pt-16 pb-20 sm:pt-24 sm:pb-28"
		>
			<motion.p variants={item} className="island-kicker mb-4">
				Altrium &middot; Customer Workspace
			</motion.p>

			<motion.h1
				variants={item}
				className="display-title max-w-3xl text-4xl font-bold text-[var(--sea-ink)] sm:text-6xl"
			>
				One workspace to run every customer relationship.
			</motion.h1>

			<motion.p
				variants={item}
				className="mt-6 max-w-2xl text-lg leading-8 text-[var(--sea-ink-soft)]"
			>
				Altrium brings your pipeline, contacts, and team into a single fast
				workspace &mdash; no bloat, no busywork. Built for teams who'd rather
				close deals than fight their CRM.
			</motion.p>

			<motion.div
				variants={item}
				className="mt-10 flex flex-wrap items-center gap-3"
			>
				<Button asChild size="lg">
					<Link to="/auth">Get started</Link>
				</Button>
				<Button asChild size="lg" variant="outline">
					<a href="#features">See how it works</a>
				</Button>
			</motion.div>
		</motion.section>
	);
}
