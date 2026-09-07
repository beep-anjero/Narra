import { ArrowUpRight } from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { AnalysisCta } from "@/features/marketing/analysis-cta";
import { navigation } from "@/features/marketing/content";

export function SiteFooter() {
  return (
    <>
      <section aria-labelledby="closing-title" className="page-container pb-20 sm:pb-24">
        <div className="rounded-2xl border border-primary/15 bg-secondary px-6 py-12 text-center sm:px-12 sm:py-16">
          <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            A new perspective
          </p>
          <h2
            id="closing-title"
            className="mx-auto max-w-2xl text-3xl leading-tight font-medium tracking-[-0.04em] sm:text-4xl"
          >
            Less time setting up.
            <br />
            More time understanding.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Take a look at where Narra is headed. Start with the sample dashboard and imagine what
            your data could tell you.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <AnalysisCta className="h-12" />
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 border-primary/20 bg-transparent"
            >
              <a href="#dashboard-preview">
                Explore the preview <ArrowUpRight aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      </section>
      <footer className="border-t bg-white py-9">
        <div className="page-container flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Brand className="text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">A clearer story in every dataset.</p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-4">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="py-2 text-sm text-muted-foreground hover:text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="page-container mt-8 flex flex-wrap justify-between gap-3 border-t pt-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Narra</p>
          <p>Made for curious minds. Preview release.</p>
        </div>
      </footer>
    </>
  );
}
