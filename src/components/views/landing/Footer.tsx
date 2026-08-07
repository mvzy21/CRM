import { Link } from "@tanstack/react-router";

export function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="site-footer mt-12 px-4 pt-10 pb-14 text-[var(--ink-soft)]">
			<div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
				<p className="m-0 text-sm">
					&copy; {year} Altrium. All rights reserved.
				</p>
				<div className="flex items-center gap-4 text-sm font-semibold">
					<a href="#features" className="nav-link">
						Features
					</a>
					<Link to="/auth" className="nav-link">
						Sign in
					</Link>
				</div>
			</div>
		</footer>
	);
}
