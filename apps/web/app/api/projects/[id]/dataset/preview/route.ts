import { UploadError } from "@/features/upload/contracts";
import { revalidatePath } from "next/cache";
import { analyzeStoredDataset, uploadLimit } from "@/lib/api/analytics";
import { authorizeProject } from "@/lib/api/project-access";
import {
  getSavedDataset,
  persistUploadedDataset,
  signedDatasetUrl,
} from "@/lib/api/saved-datasets";

export const runtime = "nodejs";
export const maxDuration = 90;
function failure(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await authorizeProject(request, (await params).id);
    if (await getSavedDataset(scope.projectId))
      return failure(
        409,
        "dataset_exists",
        "This project already has a saved dataset. Create a new project for another CSV.",
      );
    const payload = (await request.json()) as Record<string, unknown>;
    const { path, id, filename, size } = payload;
    if (
      typeof path !== "string" ||
      typeof id !== "string" ||
      typeof filename !== "string" ||
      typeof size !== "number" ||
      path !== `${scope.userId}/${scope.projectId}/${id}.csv` ||
      size > uploadLimit()
    )
      return failure(422, "invalid_upload", "The private upload reference is invalid.");
    const delimiter = payload.delimiter;
    const result = await analyzeStoredDataset(await signedDatasetUrl(path), filename, size, scope, {
      delimiter:
        delimiter === "comma" || delimiter === "semicolon" || delimiter === "tab"
          ? delimiter
          : "auto",
      headerRow: typeof payload.headerRow === "number" ? payload.headerRow : undefined,
      headerless: payload.headerless === true ? true : undefined,
    });
    await persistUploadedDataset(scope, { id, path, size }, filename, result);
    revalidatePath("/dashboard");
    revalidatePath(`/project/${scope.projectId}`, "layout");
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UploadError) return failure(error.status, error.code, error.message);
    return failure(
      503,
      "upload_failed",
      "Narra could not complete the upload. Check your connection and server configuration, then retry.",
    );
  }
}
