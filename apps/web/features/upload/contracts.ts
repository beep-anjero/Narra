import { z } from "zod";
import { statisticsSchema } from "./statistics-contract";

export const previewSchema = z
  .object({
    filename: z.string(),
    file_size: z.number().int().positive(),
    row_count: z.number().int().positive(),
    column_count: z.number().int().min(1).max(200),
    columns: z.array(z.string()).min(1).max(200),
    rows: z.array(z.array(z.string()).max(200)).min(1).max(100),
    preview_limit: z.literal(100),
    truncated: z.boolean(),
  })
  .refine(
    (value) =>
      value.columns.length === value.column_count &&
      value.rows.every((row) => row.length === value.column_count),
    "Invalid preview dimensions",
  );
export type DatasetPreview = z.infer<typeof previewSchema>;
export const columnMetadataSchema = z.object({
  name: z.string(),
  detected_type: z.enum(["numeric", "categorical", "datetime", "boolean", "text"]),
  missing_count: z.number().int().nonnegative(),
  missing_percentage: z.number().min(0).max(100),
  unique_count: z.number().int().nonnegative(),
  sample_values: z.array(z.string()).max(5),
});
export const analysisSchema = z
  .object({
    preview: previewSchema,
    column_metadata: z.array(columnMetadataSchema).max(200),
    // Accept Stage 7 services during deployment; validate and retain Stage 8 data.
    statistics: statisticsSchema.optional(),
  })
  .refine(
    (value) =>
      value.preview.column_count === value.column_metadata.length &&
      value.column_metadata.every(
        (column, index) =>
          column.name === value.preview.columns[index] &&
          column.missing_count <= value.preview.row_count &&
          column.unique_count <= value.preview.row_count - column.missing_count,
      ),
    "Invalid schema dimensions",
  )
  .refine(({ preview, column_metadata, statistics }) => {
    if (!statistics) return true;
    const { summary, columns } = statistics;
    return (
      summary.row_count === preview.row_count &&
      summary.column_count === preview.column_count &&
      summary.total_cells === preview.row_count * preview.column_count &&
      summary.complete_rows <= preview.row_count &&
      summary.missing_cells ===
        column_metadata.reduce((total, column) => total + column.missing_count, 0) &&
      columns.length === column_metadata.length &&
      columns.every((column, index) => {
        const metadata = column_metadata[index];
        return (
          column.name === metadata?.name &&
          column.detected_type === metadata.detected_type &&
          column.missing === metadata.missing_count &&
          column.unique_count === metadata.unique_count &&
          column.count + column.missing + ("invalid_count" in column ? column.invalid_count : 0) ===
            preview.row_count
        );
      })
    );
  }, "Invalid statistics dimensions");
export type DatasetAnalysis = z.infer<typeof analysisSchema>;
export const uploadErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export class UploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 422,
  ) {
    super(message);
  }
}
export const csvMimeTypes = [
  "",
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/octet-stream",
];
export function validateUpload(
  file: { name: string; size: number; type: string },
  maxBytes: number,
): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) return "Only .csv files are supported.";
  if (!file.name || file.name.length > 255 || /[\x00-\x1f]/.test(file.name))
    return "Choose a CSV with a valid filename.";
  if (!csvMimeTypes.includes(file.type.split(";")[0]?.trim().toLowerCase() ?? ""))
    return "This file type is not supported. Export it as CSV.";
  if (file.size === 0) return "This CSV is empty. Choose a file with a header and data rows.";
  if (file.size > maxBytes)
    return `This file exceeds the ${(maxBytes / 1048576).toLocaleString()} MiB upload limit.`;
  return null;
}
