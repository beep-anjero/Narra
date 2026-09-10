import type { Insight } from "./contracts";

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className="min-w-0 rounded-xl border bg-background p-5">
      <p className="text-xs font-medium text-muted-foreground">
        {insight.severity === "warning" ? "Data quality" : "Observed pattern"}
      </p>
      <h3 className="mt-2 break-words font-semibold">{insight.title}</h3>
      <p className="mt-3 break-words text-sm text-muted-foreground">{insight.description}</p>
      <details className="mt-4 text-xs">
        <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-ring">
          Calculation details
        </summary>
        <dl className="mt-3 space-y-2">
          {Object.entries(insight.metadata).map(([name, value]) => (
            <div key={name} className="flex flex-wrap justify-between gap-2">
              <dt>{name.replaceAll("_", " ")}</dt>
              <dd className="break-words tabular-nums">
                {value === null ? "Not available" : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </article>
  );
}

export function InsightPanel({ insights }: { insights?: Insight[] }) {
  return (
    <section className="mt-8" aria-label="Dataset insights">
      <h2 className="text-xl font-semibold">What stands out</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Deterministic calculations from the analyzed rows. Patterns describe observations, not
        causes or forecasts.
      </p>
      {insights?.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {insights.map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-lg border p-5 text-sm text-muted-foreground">
          {insights
            ? "No supported patterns were found in these rows."
            : "Insights were not returned for this upload."}
        </p>
      )}
    </section>
  );
}
