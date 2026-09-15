import { authorizeProject } from "@/lib/api/project-access";
import { createDatasetUpload, getSavedDataset } from "@/lib/api/saved-datasets";
import { uploadLimit } from "@/lib/api/analytics";
import { UploadError, validateUpload } from "@/features/upload/contracts";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await authorizeProject(request, (await params).id);
    if (await getSavedDataset(scope.projectId))
      throw new UploadError("dataset_exists", "This project already has a saved dataset.", 409);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") throw new Error();
    const { filename, size, mime } = payload as Record<string, unknown>;
    if (typeof filename !== "string" || typeof size !== "number" || typeof mime !== "string")
      throw new Error();
    const invalid = validateUpload({ name: filename, size, type: mime }, uploadLimit());
    if (invalid) throw new UploadError("invalid_file", invalid);
    return Response.json(await createDatasetUpload(scope, filename, size), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const failure =
      error instanceof UploadError
        ? error
        : new UploadError("invalid_request", "Narra could not prepare this upload.");
    return Response.json(
      { error: { code: failure.code, message: failure.message } },
      { status: failure.status },
    );
  }
}
