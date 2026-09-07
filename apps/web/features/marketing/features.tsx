import {
  Bookmark,
  ChartColumnIncreasing,
  Fingerprint,
  Lightbulb,
  ListFilter,
  ScanSearch,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/features/marketing/section-heading";

const features = [
  {
    icon: ScanSearch,
    title: "Get to know your dataset",
    description:
      "Automatic column detection and missing-value checks will make the shape and quality of your data visible.",
  },
  {
    icon: ChartColumnIncreasing,
    title: "The right chart for the data",
    description:
      "Recommendations will follow your column types and data quality, with a clear reason behind each chart.",
  },
  {
    icon: Lightbulb,
    title: "Patterns with an explanation",
    description:
      "Understand trends, unusual values, and correlations through insights tied to transparent calculations.",
  },
  {
    icon: ListFilter,
    title: "Ask a more focused question",
    description:
      "Filter by category, date, or number to explore a slice of your dataset across the whole dashboard.",
  },
  {
    icon: Bookmark,
    title: "Pick up where you left off",
    description:
      "Saved projects will keep your dataset and analysis together, ready for your next visit.",
  },
  {
    icon: Fingerprint,
    title: "A workspace of your own",
    description:
      "Your account will have its own projects and datasets, with access controlled at the database level.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="page-container scroll-mt-8 py-20 sm:py-24"
    >
      <SectionHeading
        id="features-title"
        eyebrow="Built around understanding"
        title="More than a place to make charts."
        description="The first release is focused on helping you understand what’s in your dataset—and what deserves a closer look."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="rounded-xl border-border bg-white py-0 shadow-none">
            <CardContent className="p-6 sm:p-7">
              <feature.icon aria-hidden="true" className="mb-6 size-6 text-primary" />
              <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-7 text-center text-sm text-muted-foreground">
        Planned for the first release. Designed around transparent calculations you can follow.
      </p>
    </section>
  );
}
