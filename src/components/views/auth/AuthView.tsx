import { Link } from "@tanstack/react-router";
import { AuthLayout } from "./AuthLayout";
import { SignInForm } from "./SignInForm";

interface AuthViewProps {
  redirect?: string;
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  invite_expired:
    "This invite link has expired or was already used. Ask your admin to resend it.",
  reset_expired: "This password reset link has expired or was already used.",
  invalid_link: "This link is invalid.",
};

export function AuthView({ redirect, error }: AuthViewProps) {
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Something went wrong with that link.")
    : null;

  return (
    <AuthLayout
      eyebrow="Sign in"
      title="Welcome back"
      subtitle={`Enter your email and password to sign in${
        redirect ? " and get back to your workspace" : ""
      }.`}
      footer="New here? Ask your admin to send you an invite."
    >
      {errorMessage ? (
        <p
          role="alert"
          className="mb-4 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
        >
          {errorMessage}{" "}
          {error === "reset_expired" ? (
            <Link
              to="/forgot-password"
              className="font-medium underline underline-offset-2"
            >
              Request a new link
            </Link>
          ) : null}
        </p>
      ) : null}

      <SignInForm redirect={redirect} />
    </AuthLayout>
  );
}
