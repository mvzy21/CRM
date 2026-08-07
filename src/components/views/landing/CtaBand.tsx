import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Button } from "#/components/ui/button.tsx";

export function CtaBand() {
	return (
		<section className="border-y border-[var(--line)] bg-[var(--surface-muted)]">
			<motion.div
				initial={{ opacity: 0, y: 16 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, amount: 0.4 }}
				transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
				className="page-wrap flex flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:py-16"
			>
				<div>
					<p className="eyebrow mb-3">Get started</p>
					<h2 className="display-title max-w-md text-2xl font-bold text-[var(--ink)] sm:text-3xl">
						Run your pipeline the way it's meant to move.
					</h2>
				</div>
				<Button asChild size="lg">
					<Link to="/auth">Get started</Link>
				</Button>
			</motion.div>
		</section>
	);
}
