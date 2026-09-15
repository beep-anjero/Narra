import "server-only";
import { z } from "zod";
import {
  analysisSchema,
  previewSchema,
  uploadErrorSchema,
  UploadError,
} from "@/features/upload/contracts";
import type { FilterRequest } from "@/features/filters/contracts";

export function uploadLimit() {
  return z.coerce
    .number()
    .int()
    .min(1)
    .max(104857600)
    .parse(process.env.MAX_UPLOAD_SIZE_BYTES ?? 26214400);
}

export async function analyzeDataset(
  content: ArrayBuffer,
  filename: string,
  mime: string,
  scope?: { userId: string; projectId: string },
  options?: CsvImportOptions,
) {
  return analyticsRequest(
    "analyze",
    content,
    {
      "Content-Type": mime || "application/octet-stream",
      "X-Filename": encodeURIComponent(filename),
      ...importHeaders(options),
    },
    scope,
    analysisSchema,
  );
}

export type CsvImportOptions = {
  delimiter?: "auto" | "comma" | "semicolon" | "tab";
  headerRow?: number;
  headerless?: boolean;
};

function importHeaders(options?: CsvImportOptions) {
  if (!options) return {};
  return {
    ...(options.delimiter && options.delimiter !== "auto"
      ? { "X-CSV-Delimiter": options.delimiter }
      : {}),
    ...(options.headerRow ? { "X-CSV-Header-Row": String(options.headerRow) } : {}),
    ...(options.headerless !== undefined ? { "X-CSV-Headerless": String(options.headerless) } : {}),
  };
}

export async function previewDataset(
  content: ArrayBuffer,
  filename: string,
  mime: string,
  options?: CsvImportOptions,
) {
  const result = await analyticsRequest(
    "preview",
    content,
    {
      "Content-Type": mime || "application/octet-stream",
      "X-Filename": encodeURIComponent(filename),
      ...importHeaders(options),
    },
    undefined,
    previewSchema,
  );
  return result;
}

export async function analyzeStoredDataset(
  signedUrl: string,
  filename: string,
  size: number,
  scope?: { userId: string; projectId: string },
  options?: CsvImportOptions,
) {
  return analyticsRequest(
    "analyze-stored",
    JSON.stringify({
      signed_url: signedUrl,
      filename,
      file_size: size,
      delimiter: options?.delimiter ?? "auto",
      header_row: options?.headerRow ?? null,
      headerless: options?.headerless ?? null,
    }),
    { "Content-Type": "application/json" },
    scope,
    analysisSchema,
  );
}

export async function previewStoredDataset(
  signedUrl: string,
  filename: string,
  size: number,
  options?: CsvImportOptions,
) {
  return analyticsRequest(
    "preview-stored",
    JSON.stringify({
      signed_url: signedUrl,
      filename,
      file_size: size,
      delimiter: options?.delimiter ?? "auto",
      header_row: options?.headerRow ?? null,
      headerless: options?.headerless ?? null,
    }),
    { "Content-Type": "application/json" },
    undefined,
    previewSchema,
  );
}

export async function filterDataset(
  filters: FilterRequest,
  scope: { userId: string; projectId: string },
) {
  return analyticsRequest(
    "filter",
    JSON.stringify(filters),
    { "Content-Type": "application/json" },
    scope,
    analysisSchema,
  );
}

async function analyticsRequest<T>(
  endpoint: string,
  content: ArrayBuffer | string,
  headers: Record<string, string>,
  scope?: { userId: string; projectId: string },
  schema?: z.ZodType<T>,
) {
  const config = z
    .object({ url: z.url().refine((value) => /^https?:\/\//.test(value)), key: z.string().min(32) })
    .safeParse({
      url: process.env.ANALYTICS_API_URL,
      key: process.env.ANALYTICS_API_KEY,
    });
  if (!config.success)
    throw new UploadError(
      "service_not_configured",
      "CSV uploads are not configured yet. Set the analytics service URL and key on the server.",
      503,
    );
  let response: Response;
  try {
    response = await fetch(`${config.data.url.replace(/\/$/, "")}/api/v1/datasets/${endpoint}`, {
      method: "POST",
      body: content,
      cache: "no-store",
      signal: AbortSignal.timeout(85000),
      headers: {
        Authorization: `Bearer ${config.data.key}`,
        ...headers,
        ...(scope ? { "X-Narra-User": scope.userId, "X-Narra-Project": scope.projectId } : {}),
      },
    });
  } catch {
    throw new UploadError(
      "backend_unavailable",
      "Narra could not reach the analytics service. Start the service and try again.",
      503,
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new UploadError(
      "invalid_response",
      "The analytics service returned an unreadable response. Please retry.",
      502,
    );
  }
  if (!response.ok) {
    const error = uploadErrorSchema.safeParse(payload);
    if ([410, 413, 415, 422].includes(response.status) && error.success)
      throw new UploadError(error.data.error.code, error.data.error.message, response.status);
    throw new UploadError(
      "backend_unavailable",
      "The analytics service is unavailable or its service key does not match. Check the server configuration.",
      503,
    );
  }
  const result = schema?.safeParse(payload);
  if (!result?.success)
    throw new UploadError(
      "invalid_response",
      "The analytics service returned an invalid analysis. Please retry.",
      502,
    );
  return result.data;
}
