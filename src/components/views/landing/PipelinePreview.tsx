import { Check } from "lucide-react";
import { motion } from "motion/react";

interface Deal {
	name: string;
	value: string;
	owner: string;
}

interface Stage {
	label: string;
	deals: Deal[];
	won?: boolean;
}

const stages: Stage[] = [
	{
		label: "New",
		deals: [
			{ name: "Nimbus Retail", value: "$18.4k", owner: "AK" },
			{ name: "Arcadia Labs", value: "$9.2k", owner: "JL" },
		],
	},
	{
		label: "In progress",
		deals: [{ name: "Fenwick & Co", value: "$42.0k", owner: "MB" }],
	},
	{
		label: "Won",
		won: true,
		deals: [{ name: "Solstice Health", value: "$27.6k", owner: "RT" }],
	},
];

const card = {
	hidden: { opacity: 0, y: 10 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
	},
};

export function PipelinePreview() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 24, rotate: -1 }}
			animate={{ opacity: 1, y: 0, rotate: -1 }}
			transition={{
				duration: 0.7,
				delay: 0.3,
				ease: [0.16, 1, 0.3, 1] as const,
			}}
			className="panel w-full max-w-md rounded-2xl p-5"
		>
			<div className="mb-4 flex items-center justify-between">
				<p className="text-sm font-semibold text-[var(--ink)]">Pipeline</p>
				<span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-soft)]">
					<span className="relative flex h-1.5 w-1.5">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-60" />
						<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
					</span>
					Synced just now
				</span>
			</div>

			<motion.div
				initial="hidden"
				animate="show"
				variants={{
					show: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } },
				}}
				className="grid grid-cols-3 gap-3"
			>
				{stages.map((stage) => (
					<div key={stage.label} className="min-w-0">
						<p className="mb-2 truncate text-[0.65rem] font-semibold tracking-wide text-[var(--ink-soft)] uppercase">
							{stage.label}
						</p>
						<div className="flex flex-col gap-2">
							{stage.deals.map((deal) => (
								<motion.div
									key={deal.name}
									variants={card}
									className="rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-2.5"
								>
									<p className="truncate text-xs font-semibold text-[var(--ink)]">
										{deal.name}
									</p>
									<div className="mt-2 flex items-center justify-between">
										<span className="text-[0.7rem] font-medium text-[var(--ink-soft)]">
											{deal.value}
										</span>
										{stage.won ? (
											<span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-strong)]">
												<Check className="h-2.5 w-2.5" strokeWidth={3} />
											</span>
										) : (
											<span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--line)] text-[0.55rem] font-semibold text-[var(--ink-soft)]">
												{deal.owner[0]}
											</span>
										)}
									</div>
								</motion.div>
							))}
						</div>
					</div>
				))}
			</motion.div>
		</motion.div>
	);
}
