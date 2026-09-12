import { analysisSchema, uploadErrorSchema, UploadError } from "@/features/upload/contracts";
import type { FilterRequest } from "@/features/filters/contracts";

export async function applyDashboardFilters(
  projectId: string,
  filters: FilterRequest,
  signal: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/dataset/filter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new UploadError(
      "network_error",
      "Narra could not reach the filtering service. Check your connection and retry.",
      503,
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new UploadError(
      "invalid_response",
      "The filter response was unreadable. Please retry.",
      502,
    );
  }
  if (!response.ok) {
    const error = uploadErrorSchema.safeParse(payload);
    throw new UploadError(
      error.success ? error.data.error.code : "filter_failed",
      error.success ? error.data.error.message : "Narra could not apply these filters.",
      response.status,
    );
  }
  const result = analysisSchema.safeParse(payload);
  if (!result.success)
    throw new UploadError(
      "invalid_response",
      "Narra returned invalid filtered data. Please retry.",
    );
  return result.data;
}
