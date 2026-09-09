"use client";

import { useId, useState } from "react";
import { ColumnTypeBadge } from "./column-type-badge";
import type { DatasetStatistics } from "./statistics-contract";

function number(value: number | null) {
  if (value === null) return "Not available";
  if (value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) >= 1e12))
    return value.toExponential(3);
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function Metrics({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 break-words text-base font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatisticsPanel({ statistics }: { statistics?: DatasetStatistics }) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  if (!statistics)
    return (
      <section className="mt-8 rounded-lg border p-5" aria-label="Statistics unavailable">
        <h2 className="font-semibold">Statistics unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Statistics were not returned for this dataset. Please upload the CSV again.
        </p>
      </section>
    );
  const { summary, columns } = statistics;
  const column = columns[selected] ?? columns[0];
  return (
    <section className="mt-8" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-xl font-semibold">
        Dataset statistics
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Calculated from all {number(summary.row_count)} rows. Preview searches and sorting do not
        change these values.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Rows", number(summary.row_count)],
          ["Columns", number(summary.column_count)],
          [
            "Missing cells",
            `${number(summary.missing_cells)} (${number(summary.missing_percentage)}%)`,
          ],
          ["Complete rows", number(summary.complete_rows)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 break-words text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Complete rows contain no blank cells. Invalid numeric or date values are counted separately
        below.
      </p>
      <div className="mt-6 rounded-lg border p-5 sm:p-6">
        <label htmlFor={`${id}-column`} className="text-sm font-medium">
          Column statistics
        </label>
        <select
          id={`${id}-column`}
          value={selected}
          onChange={(event) => setSelected(Number(event.target.value))}
          className="mt-2 block h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          {columns.map((item, index) => (
            <option key={item.name} value={index}>
              {item.name}
            </option>
          ))}
        </select>
        {column ? (
          <div className="mt-5" aria-live="polite">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <h3 className="break-words font-semibold">{column.name}</h3>
              <ColumnTypeBadge type={column.detected_type} />
            </div>
            <Metrics
              items={[
                ["Valid values", number(column.count)],
                ["Missing", `${number(column.missing)} (${number(column.missing_percentage)}%)`],
                ["Unique source values", number(column.unique_count)],
                ...("invalid_count" in column
                  ? [["Invalid values", number(column.invalid_count)] as [string, string]]
                  : []),
              ]}
            />
            <div className="mt-6 border-t pt-6">
              {column.detected_type === "numeric" ? (
                <>
                  <Metrics
                    items={[
                      ["Mean", number(column.mean)],
                      ["Median", number(column.median)],
                      ["Standard deviation", number(column.standard_deviation)],
                      ["Minimum", number(column.minimum)],
                      ["Maximum", number(column.maximum)],
                      ["Q1", number(column.q1)],
                      ["Q3", number(column.q3)],
                    ]}
                  />
                  <p className="mt-4 text-xs text-muted-foreground">
                    Sample standard deviation; quartiles use linear interpolation. Undefined or
                    unrepresentable results are shown as Not available. Display values are rounded.
                  </p>
                </>
              ) : column.detected_type === "datetime" ? (
                <Metrics
                  items={[
                    ["Earliest (UTC)", column.earliest ?? "Not available"],
                    ["Latest (UTC)", column.latest ?? "Not available"],
                    ["Range in days", number(column.range_days)],
                  ]}
                />
              ) : (
                <>
                  <Metrics
                    items={[
                      ["Most frequent value", column.top_value ?? "Not available"],
                      ["Frequency", number(column.top_value_count)],
                    ]}
                  />
                  <h4 className="mt-5 text-sm font-medium">Top categories</h4>
                  {column.top_categories.length ? (
                    <ul className="mt-3 divide-y">
                      {column.top_categories.map((item) => (
                        <li key={item.value} className="flex justify-between gap-4 py-2 text-sm">
                          <span className="min-w-0 whitespace-pre-wrap break-words">
                            {item.value}
                          </span>
                          <span className="shrink-0 tabular-nums">{number(item.count)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No non-missing values in this column.
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Up to ten categories. Original labels are preserved; frequency ties are sorted
                    by label.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No column statistics are available.</p>
        )}
      </div>
    </section>
  );
}
