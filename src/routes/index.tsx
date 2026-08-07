import { createFileRoute } from "@tanstack/react-router";
import { LandingView } from "#/components/views/landing/LandingView.tsx";

export const Route = createFileRoute("/")({ component: LandingView });
