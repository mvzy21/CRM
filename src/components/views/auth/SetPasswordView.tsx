import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { setPassword } from "#/lib/supabase/auth.ts";
import { AuthLayout } from "./AuthLayout";

/** The same screen ends both flows -- an invite and a password reset -- so
 *  only the copy changes, not the mechanics. */
const COPY = {
  invite: {
    eyebrow: "Welcome",
    title: "Set your password",
    subtitle: "Choose a password to finish setting up your account.",
    submit: "Set password and continue",
  },
  reset: {
    eyebrow: "Reset password",
    title: "Choose a new password",
    subtitle:
      "Pick a new password for your account. You'll be signed in straight after.",
    submit: "Update password and continue",
  },
} as const;

interface SetPasswordViewProps {
  mode?: "invite" | "reset";
}

export function SetPasswordView({ mode = "invite" }: SetPasswordViewProps) {
  const navigate = useNavigate();
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const copy = COPY[mode];

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
    <AuthLayout
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
    >
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
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            At least 8 characters.
          </p>
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
          {submitting ? "Saving..." : copy.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}
