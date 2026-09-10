import type { DatasetAnalysis } from "@/features/upload/contracts";

export function kpiMetrics({ preview, statistics }: DatasetAnalysis): [string, string][] {
  const metrics: [string, string][] = [
    ["Records", preview.row_count.toLocaleString()],
    ["Columns", String(preview.column_count)],
    ["Missing cells", statistics?.summary.missing_cells.toLocaleString() ?? "Not available"],
    ["Numeric columns", statistics?.summary.numeric_columns.toLocaleString() ?? "Not available"],
  ];
  const numeric = statistics?.columns.find(
    (column) =>
      column.detected_type === "numeric" &&
      column.mean !== null &&
      /(?:^|[_\s-])(revenue|sales|score|temperature|age)(?:$|[_\s-])/i.test(column.name),
  );
  if (numeric?.detected_type === "numeric" && numeric.mean !== null)
    metrics[3] = [
      `Average ${numeric.name}`,
      numeric.mean.toLocaleString("en", { maximumSignificantDigits: 6 }),
    ];
  return metrics;
}
