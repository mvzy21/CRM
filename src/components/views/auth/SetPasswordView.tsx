import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { setPassword } from "#/lib/supabase/auth.ts";

export function SetPasswordView() {
  const navigate = useNavigate();
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const result = await setPassword({ data: { password } });
    setSubmitting(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    navigate({ to: "/workspace" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <span className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
          Altrium
        </span>

        <p className="eyebrow mb-2">Welcome</p>
        <h2 className="display-title mb-2 text-2xl font-bold text-[var(--ink)]">
          Set your password
        </h2>
        <p className="mb-6 text-sm leading-6 text-[var(--ink-soft)]">
          Choose a password to finish setting up your account.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPasswordValue(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-[var(--destructive)]">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Saving..." : "Set password and continue"}
          </Button>
        </form>
      </div>
    </main>
  );
}
