import { authorizeProject } from "@/lib/api/project-access";
import { filterDataset } from "@/lib/api/analytics";
import { filterRequestSchema } from "@/features/filters/contracts";
import { UploadError } from "@/features/upload/contracts";
import { readUploadBody } from "@/features/upload/read-body";

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
    return Response.json(await filterDataset(filters.data, scope), {
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
