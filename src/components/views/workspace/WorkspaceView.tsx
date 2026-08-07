const placeholders = [
	{ title: "Pipeline", description: "Your deal stages will show up here." },
	{ title: "Contacts", description: "Everyone you work with, in one list." },
	{ title: "Activity", description: "Recent notes, calls, and updates." },
];

export function WorkspaceView() {
	return (
		<div>
			<h1 className="display-title text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
				Welcome to your workspace
			</h1>
			<p className="mt-2 max-w-xl text-sm leading-6 text-[var(--sea-ink-soft)]">
				This is a placeholder dashboard &mdash; the real pipeline, contacts, and
				activity views land in a later pass.
			</p>

			<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
				{placeholders.map((card) => (
					<div
						key={card.title}
						className="feature-card rounded-2xl border border-[var(--line)] p-6"
					>
						<h2 className="mb-1 text-sm font-semibold text-[var(--sea-ink)]">
							{card.title}
						</h2>
						<p className="text-sm text-[var(--sea-ink-soft)]">
							{card.description}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
