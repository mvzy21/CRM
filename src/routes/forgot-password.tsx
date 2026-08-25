import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordView } from "#/components/views/auth/ForgotPasswordView.tsx";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordView,
});
