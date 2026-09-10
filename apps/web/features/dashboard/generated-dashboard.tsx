"use client";

import { ChartRenderer } from "@/features/charts/chart-renderer";
import type { DatasetAnalysis } from "@/features/upload/contracts";
import { kpiMetrics } from "./kpi-metrics";

export function GeneratedDashboard({ analysis }: { analysis: DatasetAnalysis }) {
  const { recommendations, charts, preview } = analysis;
  const metrics = kpiMetrics(analysis);
  return (
    <section className="mt-10 min-w-0" aria-label="Generated dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Your data, at a glance</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Automatically generated
        </span>
      </div>
      <p className="mt-2 break-words text-sm text-muted-foreground">
        {preview.filename} · Based on all {preview.row_count.toLocaleString()} records, not just the
        preview. Averages use valid numeric values.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl border bg-muted/30 p-5">
            <dt className="break-words text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-3 break-words text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {!charts || !recommendations ? (
        <p className="mt-6 rounded-lg border p-5 text-sm text-muted-foreground">
          Chart data was not returned for this upload. Please upload the CSV again.
        </p>
      ) : !recommendations.length ? (
        <p className="mt-6 rounded-lg border p-5 text-sm text-muted-foreground">
          No suitable charts were found. Explore the statistics and preview below; charts need
          varying numeric, date, or categorical values.
        </p>
      ) : (
        <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-2">
          {recommendations.map((recommendation, index) => {
            const chart = charts.find((item) => item.recommendation_index === index);
            return (
              <article
                key={`${recommendation.chart_type}-${recommendation.x_column}-${recommendation.y_column}`}
                className={`min-w-0 rounded-xl border bg-background p-4 sm:p-6 ${index === 0 ? "lg:col-span-2" : ""}`}
              >
                <h3 className="break-words text-lg font-semibold">{recommendation.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recommendation.valid_rows.toLocaleString()} valid rows ·{" "}
                  {recommendation.aggregation === "none"
                    ? "Individual values"
                    : `${recommendation.aggregation} aggregation`}
                </p>
                {!chart ? (
                  <p className="mt-5 text-sm">Chart data is unavailable.</p>
                ) : chart.error ? (
                  <p role="alert" className="mt-5 text-sm">
                    {chart.error}
                  </p>
                ) : !chart.data.length ? (
                  <p className="mt-5 text-sm">No values are available for this chart.</p>
                ) : (
                  <>
                    <div className="mt-5">
                      <ChartRenderer recommendation={recommendation} chart={chart} />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{chart.note}</p>
                    <details className="mt-4 text-sm">
                      <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-ring">
                        View chart data
                      </summary>
                      <div
                        className="mt-3 max-h-64 overflow-auto"
                        tabIndex={0}
                        role="region"
                        aria-label={`Data for ${recommendation.title}`}
                      >
                        <p className="mb-2 text-xs text-muted-foreground">
                          Showing {Math.min(50, chart.data.length)} of {chart.data.length} plotted
                          values.
                        </p>
                        <table className="w-full text-left text-xs">
                          <caption className="sr-only">{recommendation.title}</caption>
                          <thead>
                            <tr>
                              <th scope="col" className="p-2">
                                {recommendation.x_column}
                              </th>
                              <th scope="col" className="p-2">
                                {recommendation.y_column ?? "Records"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {chart.data.slice(0, 50).map((point, i) => (
                              <tr key={i} className="border-t">
                                <td className="max-w-56 break-words p-2">{point.x}</td>
                                <td className="p-2 tabular-nums">
                                  {point.y.toLocaleString("en", { maximumSignificantDigits: 10 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </>
                )}
                <details className="mt-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-ring">
                    Why this chart?
                  </summary>
                  <p className="mt-2">{recommendation.reason}</p>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
