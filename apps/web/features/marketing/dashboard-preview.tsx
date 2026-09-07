import {
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  Lightbulb,
  Table2,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  categoryPreview,
  dollars,
  juneChange,
  previewTotal,
  revenuePreview,
} from "@/features/marketing/content";

function RevenueChart() {
  const points = revenuePreview
    .map((month, index) => `${52 + index * 100},${190 - (month.revenue / 32000) * 165}`)
    .join(" ");

  return (
    <svg
      viewBox="0 0 580 224"
      role="img"
      aria-labelledby="revenue-chart-title revenue-chart-description"
      className="mt-5 w-full overflow-visible"
    >
      <title id="revenue-chart-title">Monthly revenue, January to June 2026</title>
      <desc id="revenue-chart-description">
        Illustrative revenue rises from $15,480 in January to $29,600 in June, with a dip in March.
        Exact values follow in the accessible data table.
      </desc>
      {[0, 10000, 20000, 30000].map((value) => {
        const y = 190 - (value / 32000) * 165;
        return (
          <g key={value}>
            <line x1="52" y1={y} x2="552" y2={y} stroke="var(--border)" strokeDasharray="3 5" />
            <text x="0" y={y + 4} fill="var(--muted-foreground)" fontSize="12">
              ${value / 1000}k
            </text>
          </g>
        );
      })}
      <polygon points={`52,190 ${points} 552,190`} fill="var(--secondary)" opacity="0.8" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {revenuePreview.map((month, index) => (
        <g key={month.month}>
          <circle
            cx={52 + index * 100}
            cy={190 - (month.revenue / 32000) * 165}
            r="4"
            fill="var(--card)"
            stroke="var(--primary)"
            strokeWidth="2"
          />
          <text
            x={52 + index * 100}
            y="219"
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="12"
          >
            {month.month}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DashboardPreview() {
  return (
    <section
      id="dashboard-preview"
      aria-labelledby="preview-title"
      className="page-container scroll-mt-8 pb-20 sm:pb-28"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_70px_-35px_rgba(24,57,43,0.3)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-muted/50 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3 text-sm font-medium">
            <ChartNoAxesCombined aria-hidden="true" className="size-5 text-primary" />
            Narra workspace
            <span className="hidden font-normal text-muted-foreground sm:inline">
              / Sales analysis
            </span>
          </div>
          <Badge variant="outline" className="gap-1.5 bg-white text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Illustrative preview
          </Badge>
        </div>
        <div className="p-5 sm:p-7 lg:p-8">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="preview-title" className="text-2xl font-semibold tracking-tight">
                Ecommerce overview
              </h2>
              <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                <Table2 aria-hidden="true" className="size-4" />
                ecommerce-sales.csv<span aria-hidden="true">·</span>Sample dataset
              </p>
            </div>
            <p className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
              <CalendarDays aria-hidden="true" className="size-4" />
              Jan – Jun 2026
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                label: "Total revenue",
                value: dollars.format(previewTotal),
                detail: "Across all six months",
              },
              {
                label: "Monthly average",
                value: dollars.format(previewTotal / revenuePreview.length),
                detail: "Revenue per month",
              },
              { label: "Top category", value: "Electronics", detail: "36% of total revenue" },
            ].map((metric) => (
              <Card key={metric.label} className="gap-2 rounded-xl p-5 shadow-none">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-semibold tracking-tight lg:text-3xl">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.detail}</p>
              </Card>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <Card className="min-w-0 gap-0 rounded-xl p-5 shadow-none sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">Revenue over time</h3>
                <Badge variant="secondary" className="gap-1.5 text-primary">
                  <TrendingUp aria-hidden="true" className="size-3.5" />
                  {juneChange}% in June
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Monthly revenue · USD</p>
              <div
                className="overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label="Monthly revenue chart. Scroll horizontally on smaller screens."
              >
                <div className="min-w-[30rem]">
                  <RevenueChart />
                </div>
              </div>
              <table className="sr-only">
                <caption>Sample monthly revenue in US dollars</caption>
                <thead>
                  <tr>
                    <th scope="col">Month</th>
                    <th scope="col">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenuePreview.map((month) => (
                    <tr key={month.month}>
                      <th scope="row">{month.month}</th>
                      <td>{dollars.format(month.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card className="gap-0 rounded-xl p-5 shadow-none sm:p-6">
              <h3 className="font-semibold">Revenue by category</h3>
              <p className="mt-1 text-sm text-muted-foreground">Share of total revenue</p>
              <ul className="mt-7 space-y-5">
                {categoryPreview.map((category) => (
                  <li key={category.name}>
                    <div className="mb-2 flex justify-between gap-3 text-sm">
                      <span>{category.name}</span>
                      <span className="font-medium tabular-nums">{category.share}%</span>
                    </div>
                    <div aria-hidden="true" className="h-2.5 rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${category.color}`}
                        style={{ width: `${category.share}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/15 bg-secondary/70 p-4 sm:flex-row sm:items-start sm:p-5">
            <Lightbulb aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-primary">A pattern worth noticing</h3>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                June revenue is {juneChange}% higher than May. Electronics accounts for the largest
                share of revenue, at 36%.
              </p>
            </div>
            <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-primary">
              <Check aria-hidden="true" className="size-3.5" />
              Based on sample values
            </span>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
        An example of the view we’re building. These are illustrative values; CSV uploads, live
        filters, and a working demo will arrive in a future release.
      </p>
    </section>
  );
}
