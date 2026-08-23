import { KanbanSquare, Users, Workflow, Zap } from "lucide-react";
import { motion } from "motion/react";

const features = [
  {
    icon: Users,
    title: "Contacts that stay in sync",
    description:
      "Every contact, company, and conversation lives in one place, automatically kept up to date across your team.",
  },
  {
    icon: KanbanSquare,
    title: "Pipelines built for speed",
    description:
      "Drag-and-drop deal boards that match how your team actually sells, not how a spreadsheet thinks you should.",
  },
  {
    icon: Workflow,
    title: "Workspaces per team",
    description:
      "Each team gets its own workspace boundary, so data, permissions, and workflows never bleed into one another.",
  },
  {
    icon: Zap,
    title: "Fast by default",
    description:
      "No spinners, no waiting on page loads. Altrium is built to feel instant, even with years of customer history.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="page-wrap px-4 py-16 sm:py-20">
      <div className="mb-10 max-w-xl">
        <p className="eyebrow mb-3">Features</p>
        <h2 className="display-title text-3xl font-bold text-[var(--ink)] sm:text-4xl">
          Everything your team needs, nothing it doesn't.
        </h2>
      </div>

      <div id="pipeline" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              duration: 0.5,
              delay: index * 0.08,
              ease: [0.16, 1, 0.3, 1] as const,
            }}
            className="feature-card rounded-2xl border border-[var(--line)] p-6"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--kicker)]">
              <feature.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--ink)]">
              {feature.title}
            </h3>
            <p className="text-sm leading-6 text-[var(--ink-soft)]">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
