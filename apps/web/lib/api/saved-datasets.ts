import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { analysisSchema, UploadError, type DatasetAnalysis } from "@/features/upload/contracts";
import { analyzeDataset, uploadLimit } from "./analytics";

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

export async function persistDataset(
  scope: Scope,
  content: ArrayBuffer,
  filename: string,
  analysis: DatasetAnalysis,
) {
  const client = await createSupabaseServerClient(true);
  const id = randomUUID();
  const path = `${scope.userId}/${scope.projectId}/${id}.csv`;
  const uploaded = await client.storage
    .from(bucket)
    .upload(path, content, { contentType: "text/csv", upsert: false });
  if (uploaded.error)
    throw new UploadError(
      "storage_unavailable",
      "The CSV could not be saved to private storage. Check the datasets bucket and its upload limit, then retry.",
      503,
    );
  const snapshot = {
    ...analysis,
    filter_context: analysis.filter_context ? { ...analysis.filter_context, token: null } : null,
  };
  try {
    const saved = await client.rpc("save_analysis", {
      p_project: scope.projectId,
      p_dataset: id,
      p_filename: filename,
      p_size: content.byteLength,
      p_analysis: snapshot,
    });
    if (saved.error) throw saved.error;
  } catch {
    // A timed-out RPC may have committed. Never delete its object without checking.
    const check = await client.from("datasets").select("id").eq("id", id).maybeSingle();
    if (check.data) return;
    if (!check.error) await client.storage.from(bucket).remove([path]);
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
  const client = await createSupabaseServerClient();
  const { data, error } = await client.storage.from(bucket).download(saved.storage_path);
  if (error || !data)
    throw new UploadError(
      "storage_unavailable",
      "Narra could not retrieve the saved CSV. Retry when private storage is available.",
      503,
    );
  if (data.size > uploadLimit())
    throw new UploadError("file_too_large", "The stored CSV exceeds the processing limit.", 413);
  return analyzeDataset(await data.arrayBuffer(), saved.original_filename, "text/csv", scope);
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
