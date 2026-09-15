import { UploadError } from "@/features/upload/contracts";
import { previewStoredDataset, uploadLimit, type CsvImportOptions } from "@/lib/api/analytics";
import { authorizeProject } from "@/lib/api/project-access";
import { getSavedDataset, signedDatasetUrl } from "@/lib/api/saved-datasets";

export const runtime = "nodejs";
export const maxDuration = 90;

function failure(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

function options(payload: Record<string, unknown>): CsvImportOptions {
  const row = typeof payload.headerRow === "number" ? payload.headerRow : undefined;
  const delimiter = payload.delimiter;
  return {
    delimiter:
      delimiter === "comma" || delimiter === "semicolon" || delimiter === "tab"
        ? delimiter
        : "auto",
    headerRow: row && row <= 100 ? row : undefined,
    headerless: payload.headerless === true ? true : undefined,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await authorizeProject(request, (await params).id);
    if (await getSavedDataset(scope.projectId))
      return failure(409, "dataset_exists", "This project already has a saved dataset.");
    const payload = (await request.json()) as Record<string, unknown>;
    if (
      typeof payload.path !== "string" ||
      typeof payload.id !== "string" ||
      typeof payload.filename !== "string" ||
      typeof payload.size !== "number" ||
      payload.path !== `${scope.userId}/${scope.projectId}/${payload.id}.csv` ||
      payload.size > uploadLimit()
    )
      throw new UploadError("invalid_upload", "The private upload reference is invalid.");
    return Response.json(
      await previewStoredDataset(
        await signedDatasetUrl(payload.path),
        payload.filename,
        payload.size,
        options(payload),
      ),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof UploadError) return failure(error.status, error.code, error.message);
    return failure(503, "preview_failed", "Narra could not inspect this CSV. Please retry.");
  }
}
