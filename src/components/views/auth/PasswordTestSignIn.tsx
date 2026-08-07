import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { supabase } from "#/lib/supabase.ts";

interface PasswordTestSignInProps {
	redirect?: string;
}

export function PasswordTestSignIn({ redirect }: PasswordTestSignInProps) {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);

		const { error: signInError } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		setSubmitting(false);

		if (signInError) {
			setError(signInError.message);
			return;
		}

		navigate({ to: redirect ?? "/workspace" });
	}

	return (
		<details className="mt-6 border-t border-[var(--line)] pt-4">
			<summary className="cursor-pointer text-xs font-semibold text-[var(--sea-ink-soft)]">
				Dev: sign in with a test password
			</summary>
			<form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
				<div>
					<Label htmlFor="test-email">Email</Label>
					<Input
						id="test-email"
						type="email"
						required
						autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
				</div>
				<div>
					<Label htmlFor="test-password">Password</Label>
					<Input
						id="test-password"
						type="password"
						required
						autoComplete="current-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
					/>
				</div>
				{error ? (
					<p className="text-sm text-[var(--destructive)]">{error}</p>
				) : null}
				<Button type="submit" variant="outline" disabled={submitting}>
					{submitting ? "Signing in..." : "Sign in"}
				</Button>
			</form>
		</details>
	);
}
