import { authorizeProject } from "@/lib/api/project-access";
import { filterDataset } from "@/lib/api/analytics";
import { filterRequestSchema } from "@/features/filters/contracts";
import { UploadError } from "@/features/upload/contracts";
import { readUploadBody } from "@/features/upload/read-body";
import { restoreDataset } from "@/lib/api/saved-datasets";

export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await authorizeProject(request, (await params).id);
    let body: ArrayBuffer;
    try {
      body = await readUploadBody(request, 65536);
    } catch (error) {
      if (error instanceof UploadError)
        throw new UploadError(
          "invalid_filter",
          error.status === 413
            ? "Filter requests must be smaller than 64 KiB."
            : "The filter request is empty.",
          error.status,
        );
      throw error;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(body));
    } catch {
      throw new UploadError("invalid_filter", "The dashboard filters are unreadable.");
    }
    const filters = filterRequestSchema.safeParse(payload);
    if (!filters.success)
      throw new UploadError("invalid_filter", "Enter valid filter values and ordered ranges.");
    let result;
    try {
      if (!filters.data.token)
        throw new UploadError("analysis_expired", "Restore saved analysis.", 410);
      result = await filterDataset(filters.data, scope);
    } catch (error) {
      if (!(error instanceof UploadError) || error.status !== 410) throw error;
      const restored = await restoreDataset(scope);
      if (!filters.data.filters.length) result = restored;
      else {
        if (!restored.filter_context?.token)
          throw new UploadError(
            "filter_capacity",
            "This dataset exceeds temporary filter capacity. Its saved dashboard is still available.",
            422,
          );
        result = await filterDataset(
          { ...filters.data, token: restored.filter_context.token },
          scope,
        );
      }
    }
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const failure =
      error instanceof UploadError
        ? error
        : new UploadError(
            "filter_failed",
            "Narra could not update the dashboard. Please retry.",
            503,
          );
    return Response.json(
      { error: { code: failure.code, message: failure.message } },
      { status: failure.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
