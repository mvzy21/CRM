import { Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { requestPasswordReset } from "#/lib/supabase/auth.ts";
import { AuthLayout } from "./AuthLayout";

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setFieldError("Enter a valid email address");
      return;
    }
    setFieldError(null);
    setSubmitting(true);

    const result = await requestPasswordReset({ data: { email: trimmed } });

    setSubmitting(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    setSent(true);
  }

  // The confirmation deliberately doesn't say whether an account exists --
  // same wording either way, so the form can't be used to probe for emails.
  if (sent) {
    return (
      <AuthLayout
        eyebrow="Reset password"
        title="Check your email"
        subtitle={
          <>
            If an account exists for <strong>{email.trim()}</strong>, a reset
            link is on its way. The link expires in an hour.
          </>
        }
        footer={
          <>
            Didn't get it? Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-medium text-[var(--ink)] underline underline-offset-2"
            >
              try another address
            </button>
            .
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--muted)]/40 px-4 py-3">
          <MailCheck className="h-5 w-5 shrink-0 text-[var(--primary)]" />
          <p className="text-sm text-[var(--ink-soft)]">
            Open the email and follow the link to choose a new password.
          </p>
        </div>

        <Button asChild size="lg" variant="outline" className="mt-3 w-full">
          <Link to="/auth">Back to sign in</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Forgot your password?"
      subtitle="Enter the email you sign in with and we'll send you a link to choose a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link
            to="/auth"
            className="font-medium text-[var(--ink)] underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            aria-invalid={Boolean(fieldError)}
            onChange={(event) => setEmail(event.target.value)}
          />
          {fieldError ? (
            <p className="mt-1 text-xs text-[var(--destructive)]">
              {fieldError}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="text-sm text-[var(--destructive)]">
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
