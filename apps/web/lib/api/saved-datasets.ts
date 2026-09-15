import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { analysisSchema, UploadError, type DatasetAnalysis } from "@/features/upload/contracts";
import { analyzeStoredDataset, uploadLimit } from "./analytics";

type Scope = { userId: string; projectId: string };
const bucket = "datasets";

export async function getSavedDataset(projectId: string) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("datasets")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error)
    throw new UploadError(
      "database_unavailable",
      "Narra could not load the saved dataset. Check the database connection and apply the datasets migration.",
      503,
    );
  if (!data) return null;
  const result = analysisSchema.safeParse(data.analysis);
  if (!result.success)
    throw new UploadError(
      "invalid_saved_analysis",
      "The saved analysis has an incompatible format. Create a new project to analyze the CSV again.",
      422,
    );
  return { ...data, analysis: result.data };
}

export async function createDatasetUpload(scope: Scope, filename: string, size: number) {
  if (size < 1 || size > uploadLimit())
    throw new UploadError("file_too_large", "This CSV exceeds the upload limit.", 413);
  const client = await createSupabaseServerClient(true);
  const id = randomUUID();
  const path = `${scope.userId}/${scope.projectId}/${id}.csv`;
  const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data)
    throw new UploadError(
      "storage_unavailable",
      "Narra could not prepare the private upload.",
      503,
    );
  return { id, path, token: data.token, filename, size };
}

export async function signedDatasetUrl(path: string) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 300);
  if (error || !data)
    throw new UploadError("storage_unavailable", "Narra could not read the private CSV.", 503);
  return data.signedUrl;
}

export async function discardDatasetUpload(path: string) {
  const client = await createSupabaseServerClient(true);
  await client.storage.from(bucket).remove([path]);
}

export async function persistUploadedDataset(
  scope: Scope,
  upload: { id: string; path: string; size: number },
  filename: string,
  analysis: DatasetAnalysis,
) {
  const client = await createSupabaseServerClient(true);
  const snapshot = {
    ...analysis,
    filter_context: analysis.filter_context ? { ...analysis.filter_context, token: null } : null,
  };
  try {
    const saved = await client.rpc("save_analysis", {
      p_project: scope.projectId,
      p_dataset: upload.id,
      p_filename: filename,
      p_size: upload.size,
      p_analysis: snapshot,
    });
    if (saved.error) throw saved.error;
  } catch {
    // A timed-out RPC may have committed. Never delete its object without checking.
    const check = await client.from("datasets").select("id").eq("id", upload.id).maybeSingle();
    if (check.data) return;
    if (!check.error) await client.storage.from(bucket).remove([upload.path]);
    throw new UploadError(
      "save_failed",
      "Narra could not confirm the saved analysis. Reopen this project before retrying; only one dataset is allowed per project.",
      503,
    );
  }
}

export async function restoreDataset(scope: Scope) {
  const saved = await getSavedDataset(scope.projectId);
  if (!saved)
    throw new UploadError(
      "dataset_missing",
      "This project has no saved dataset. Upload a CSV first.",
      404,
    );
  if (saved.file_size > uploadLimit())
    throw new UploadError(
      "file_too_large",
      "This saved CSV exceeds the current processing limit. Increase the server limit to filter it.",
      413,
    );
  return analyzeStoredDataset(
    await signedDatasetUrl(saved.storage_path),
    saved.original_filename,
    saved.file_size,
    scope,
  );
}

export async function removeProjectFiles(scope: Scope) {
  const client = await createSupabaseServerClient(true);
  const prefix = `${scope.userId}/${scope.projectId}`;
  // Repeat the first page because removal shifts subsequent pages.
  for (;;) {
    const listed = await client.storage.from(bucket).list(prefix, { limit: 100 });
    if (listed.error) throw new Error("Could not list project files for deletion.");
    if (!listed.data.length) return;
    const removed = await client.storage
      .from(bucket)
      .remove(listed.data.map((file) => `${prefix}/${file.name}`));
    if (removed.error) throw new Error("Could not delete project files. Please retry.");
  }
}
