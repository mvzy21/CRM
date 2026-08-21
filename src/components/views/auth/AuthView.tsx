import { motion } from "motion/react";
import { SignInForm } from "./SignInForm";

interface AuthViewProps {
  redirect?: string;
}

export function AuthView({ redirect }: AuthViewProps) {
  return (
    <main className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#14181c] p-10 text-[#f3f1ec] md:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 560px at 15% -10%, rgba(251,180,1,0.22), transparent 60%), radial-gradient(700px 480px at 100% 100%, rgba(251,180,1,0.1), transparent 55%)",
          }}
        />

        <span className="relative inline-flex items-center gap-2 text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
          Altrium
        </span>

        <div className="relative max-w-md">
          <h1 className="display-title text-3xl font-bold leading-tight lg:text-4xl">
            Every Deal Has a Story
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#a7aeb4]">
            Sign in to pick up where you left off — leads, deals, and the people
            behind them, all in one place.
          </p>
        </div>

        <p className="relative text-xs text-[#a7aeb4]">
          &copy; {new Date().getFullYear()} Altrium. All rights reserved.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-4 py-16 md:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
          className="w-full max-w-sm"
        >
          <span className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)] md:hidden">
            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            Altrium
          </span>

          <p className="eyebrow mb-2">Sign in</p>
          <h2 className="display-title mb-2 text-2xl font-bold text-[var(--ink)]">
            Welcome back
          </h2>
          <p className="mb-6 text-sm leading-6 text-[var(--ink-soft)]">
            Enter your email and password to sign in
            {redirect ? " and get back to your workspace" : ""}.
          </p>

          <SignInForm redirect={redirect} />

          <p className="mt-6 text-center text-xs text-[var(--ink-soft)]">
            New here? Ask your admin to send you an invite.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
