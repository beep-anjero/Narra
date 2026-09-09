import "server-only";
import { z } from "zod";
import { analysisSchema, uploadErrorSchema, UploadError } from "@/features/upload/contracts";

export function uploadLimit() {
  return z.coerce
    .number()
    .int()
    .min(1)
    .max(104857600)
    .parse(process.env.MAX_UPLOAD_SIZE_BYTES ?? 20971520);
}

export async function analyzeDataset(content: ArrayBuffer, filename: string, mime: string) {
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
    response = await fetch(`${config.data.url.replace(/\/$/, "")}/api/v1/datasets/analyze`, {
      method: "POST",
      body: content,
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
      headers: {
        Authorization: `Bearer ${config.data.key}`,
        "Content-Type": mime || "application/octet-stream",
        "X-Filename": encodeURIComponent(filename),
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
    if ([413, 415, 422].includes(response.status) && error.success)
      throw new UploadError(error.data.error.code, error.data.error.message, response.status);
    throw new UploadError(
      "backend_unavailable",
      "The analytics service is unavailable or its service key does not match. Check the server configuration.",
      503,
    );
  }
  const result = analysisSchema.safeParse(payload);
  if (!result.success)
    throw new UploadError(
      "invalid_response",
      "The analytics service returned an invalid analysis. Please retry.",
      502,
    );
  return result.data;
}
