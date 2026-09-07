import { ChartNoAxesCombined, FileUp, ScanLine } from "lucide-react";

import { SectionHeading } from "@/features/marketing/section-heading";

const steps = [
  {
    icon: FileUp,
    title: "Bring your CSV",
    description:
      "Start with a spreadsheet export. Narra will check the file and help you spot issues before the analysis begins.",
  },
  {
    icon: ScanLine,
    title: "Let the data lead",
    description:
      "Column types, missing values, and useful statistics will guide which visualizations make sense for your dataset.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "See the bigger picture",
    description:
      "Explore a generated dashboard, follow the patterns, and return to your saved analysis when you need it.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="scroll-mt-8 border-y bg-white py-20 sm:py-24"
    >
      <div className="page-container">
        <SectionHeading
          id="how-it-works-title"
          eyebrow="The idea is simple"
          title="From rows and columns to a clearer view."
          description="A thoughtful workflow designed to do the initial analysis for you."
        />
        <ol className="grid gap-10 md:grid-cols-3 md:gap-9">
          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              <div className="mb-6 flex items-center gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <step.icon aria-hidden="true" className="size-6" />
                </span>
                <span
                  aria-hidden="true"
                  className="text-xs font-medium tracking-widest text-muted-foreground"
                >
                  0{index + 1}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
