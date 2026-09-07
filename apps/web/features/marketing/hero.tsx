import { ArrowDown, ChartNoAxesCombined, CirclePlay } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnalysisCta } from "@/features/marketing/analysis-cta";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="page-container pt-16 pb-12 text-center sm:pt-23 sm:pb-16"
    >
      <p className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-primary">
        <ChartNoAxesCombined aria-hidden="true" className="size-4" />
        Less spreadsheet. More perspective.
      </p>
      <h1
        id="hero-title"
        className="mx-auto max-w-5xl text-[2.6rem] leading-[1.1] font-medium tracking-[-0.055em] sm:text-6xl lg:text-[4.25rem]"
      >
        Turn raw datasets into
        <br className="hidden sm:block" />{" "}
        <span className="text-primary">understandable dashboards.</span>
      </h1>
      <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Bring the data. Find the story. Narra is being built to turn your CSV into useful charts,
        clear statistics, and insights you can actually explain.
      </p>
      <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <AnalysisCta className="h-12 px-6" />
        <Button asChild variant="outline" size="lg" className="h-12 bg-white px-6">
          <a href="#dashboard-preview">
            <CirclePlay aria-hidden="true" />
            Try Demo Data
          </a>
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Preview release · CSV analysis and the interactive demo are coming soon.
      </p>
      <a
        href="#dashboard-preview"
        className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        Take a look inside <ArrowDown aria-hidden="true" className="size-4" />
      </a>
    </section>
  );
}
