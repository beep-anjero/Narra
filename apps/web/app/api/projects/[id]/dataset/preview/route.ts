import { projectIdSchema } from "@/features/projects/schemas";
import { UploadError, validateUpload } from "@/features/upload/contracts";
import { readUploadBody } from "@/features/upload/read-body";
import { analyzeDataset, uploadLimit } from "@/lib/api/analytics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 90;
function failure(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Browser sends a custom filename header; require exact Origin as defense against CSRF.
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return failure(403, "invalid_origin", "Upload this file from your Narra project page.");
  try {
    // Use one writable client so refreshed session cookies persist without sending
    // large upload bodies through Next.js Proxy's request-cloning buffer.
    const client = await createSupabaseServerClient(true);
    const { data: identity, error: authError } = await client.auth.getUser();
    if (authError || !identity.user)
      return failure(401, "unauthorized", "Your session has expired. Log in before uploading.");
    const user = identity.user;
    const id = projectIdSchema.safeParse((await params).id);
    if (!id.success) return failure(404, "project_unavailable", "This project is unavailable.");
    const { data, error } = await client
      .from("projects")
      .select("id")
      .eq("id", id.data)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error)
      return failure(
        503,
        "database_unavailable",
        "Narra could not verify this project. Check the database connection and retry.",
      );
    if (!data) return failure(404, "project_unavailable", "This project is unavailable.");
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
    const result = await analyzeDataset(content, name, mime);
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
