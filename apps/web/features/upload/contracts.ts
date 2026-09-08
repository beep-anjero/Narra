import { z } from "zod";

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
