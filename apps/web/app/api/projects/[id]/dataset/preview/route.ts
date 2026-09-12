import { UploadError, validateUpload } from "@/features/upload/contracts";
import { readUploadBody } from "@/features/upload/read-body";
import { analyzeDataset, uploadLimit } from "@/lib/api/analytics";
import { authorizeProject } from "@/lib/api/project-access";

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
    let name: string;
    try {
      name = decodeURIComponent(request.headers.get("x-filename") ?? "");
    } catch {
      return failure(422, "invalid_filename", "Choose a CSV with a valid filename.");
    }
    const mime = request.headers.get("content-type") ?? "";
    const limit = uploadLimit();
    const invalid = validateUpload({ name, type: mime, size: 1 }, limit);
    if (invalid) return failure(415, "invalid_file", invalid);
    const content = await readUploadBody(request, limit);
    const result = await analyzeDataset(content, name, mime, scope);
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
