import "server-only";
import { projectIdSchema } from "@/features/projects/schemas";
import { UploadError } from "@/features/upload/contracts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function authorizeProject(request: Request, rawId: string) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new UploadError("invalid_origin", "Use your Narra project page for this request.", 403);
  const client = await createSupabaseServerClient(true);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    throw new UploadError("unauthorized", "Your session has expired. Log in again.", 401);
  const id = projectIdSchema.safeParse(rawId);
  if (!id.success)
    throw new UploadError("project_unavailable", "This project is unavailable.", 404);
  const project = await client
    .from("projects")
    .select("id")
    .eq("id", id.data)
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (project.error)
    throw new UploadError(
      "database_unavailable",
      "Narra could not verify this project. Retry when the database is available.",
      503,
    );
  if (!project.data)
    throw new UploadError("project_unavailable", "This project is unavailable.", 404);
  return { userId: data.user.id, projectId: id.data };
}
