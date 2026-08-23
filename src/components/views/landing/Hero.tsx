import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Button } from "#/components/ui/button.tsx";
import { PipelinePreview } from "./PipelinePreview";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Hero() {
  return (
    <section className="page-wrap grid grid-cols-1 items-center gap-12 px-4 pt-16 pb-8 sm:pt-24 sm:pb-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.p variants={item} className="eyebrow mb-4">
          Altrium &middot; Customer Workspace
        </motion.p>

        <motion.h1
          variants={item}
          className="display-title max-w-xl text-4xl font-bold text-[var(--ink)] sm:text-5xl"
        >
          One workspace to run every customer relationship.
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-lg text-lg leading-8 text-[var(--ink-soft)]"
        >
          Altrium brings your pipeline, contacts, and team into a single fast
          workspace &mdash; no bloat, no busywork. Built for teams who'd rather
          close deals than fight their CRM.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Button asChild size="lg">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#features">See how it works</a>
          </Button>
        </motion.div>

        <motion.p
          variants={item}
          className="mt-5 text-sm text-[var(--ink-soft)]"
        >
          Set up your workspace in minutes &mdash; no credit card required.
        </motion.p>
      </motion.div>

      <div className="flex justify-center lg:justify-end">
        <PipelinePreview />
      </div>
    </section>
  );
}
