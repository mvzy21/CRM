import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";

type Status = "idle" | "submitting" | "sent";

export function MagicLinkForm() {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<Status>("idle");

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!email || status === "submitting") return;

		setStatus("submitting");
		// TODO: wire to Supabase auth once ready:
		// await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })
		window.setTimeout(() => setStatus("sent"), 600);
	}

	return (
		<AnimatePresence mode="wait">
			{status === "sent" ? (
				<motion.div
					key="sent"
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -8 }}
					transition={{ duration: 0.3 }}
					className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--sea-ink)]"
				>
					Check <span className="font-semibold">{email}</span> for a sign-in
					link.
				</motion.div>
			) : (
				<motion.form
					key="form"
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -8 }}
					transition={{ duration: 0.3 }}
					onSubmit={handleSubmit}
					className="flex flex-col gap-3"
				>
					<Label htmlFor="email">Email address</Label>
					<Input
						id="email"
						type="email"
						required
						autoComplete="email"
						placeholder="you@company.com"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
					<Button type="submit" size="lg" disabled={status === "submitting"}>
						{status === "submitting" ? "Sending..." : "Send magic link"}
					</Button>
				</motion.form>
			)}
		</AnimatePresence>
	);
}
