import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { signInSchema, signInWithPassword } from "#/lib/supabase/auth.ts";

interface SignInFormProps {
	redirect?: string;
}

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function SignInForm({ redirect }: SignInFormProps) {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFormError(null);

		const parsed = signInSchema.safeParse({ email, password });
		if (!parsed.success) {
			const errors: FieldErrors = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0];
				if (key === "email" || key === "password") errors[key] = issue.message;
			}
			setFieldErrors(errors);
			return;
		}
		setFieldErrors({});
		setSubmitting(true);

		const result = await signInWithPassword({ data: parsed.data });

		setSubmitting(false);

		if (!result.success) {
			setFormError(result.message);
			return;
		}

		navigate({ to: redirect ?? "/workspace" });
	}

	return (
		<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
			<div>
				<Label htmlFor="email">Email address</Label>
				<Input
					id="email"
					name="email"
					type="email"
					required
					autoComplete="email"
					placeholder="you@company.com"
					value={email}
					aria-invalid={Boolean(fieldErrors.email)}
					onChange={(event) => setEmail(event.target.value)}
				/>
				{fieldErrors.email ? (
					<p className="mt-1 text-xs text-[var(--destructive)]">{fieldErrors.email}</p>
				) : null}
			</div>

			<div>
				<Label htmlFor="password">Password</Label>
				<Input
					id="password"
					name="password"
					type="password"
					required
					autoComplete="current-password"
					value={password}
					aria-invalid={Boolean(fieldErrors.password)}
					onChange={(event) => setPassword(event.target.value)}
				/>
				{fieldErrors.password ? (
					<p className="mt-1 text-xs text-[var(--destructive)]">{fieldErrors.password}</p>
				) : null}
			</div>

			{formError ? (
				<p role="alert" className="text-sm text-[var(--destructive)]">
					{formError}
				</p>
			) : null}

			<Button type="submit" size="lg" disabled={submitting}>
				{submitting ? "Signing in..." : "Sign in"}
			</Button>
		</form>
	);
}
