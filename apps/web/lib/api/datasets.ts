import {
  analysisSchema,
  previewSchema,
  uploadErrorSchema,
  UploadError,
  type DatasetAnalysis,
  type DatasetPreview,
} from "@/features/upload/contracts";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CsvImportOptions } from "./analytics";

export type DatasetUpload = {
  id: string;
  path: string;
  token: string;
  filename: string;
  size: number;
};

async function responseError(response: Response, fallback: string): Promise<never> {
  const payload: unknown = await response.json();
  const error = uploadErrorSchema.safeParse(payload);
  throw new UploadError(
    error.success ? error.data.error.code : "upload_failed",
    error.success ? error.data.error.message : fallback,
    response.status,
  );
}

export async function inspectDataset(
  projectId: string,
  file: File,
  options: CsvImportOptions,
  onProgress?: (percent: number) => void,
  existing?: DatasetUpload | null,
): Promise<{ preview: DatasetPreview; upload: DatasetUpload }> {
  let upload = existing;
  if (!upload) {
    const prepared = await fetch(`/api/projects/${encodeURIComponent(projectId)}/dataset/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, size: file.size, mime: file.type }),
    });
    if (!prepared.ok) return responseError(prepared, "Narra could not prepare the upload.");
    upload = (await prepared.json()) as DatasetUpload;
    onProgress?.(10);
    const stored = await createSupabaseBrowserClient()
      .storage.from("datasets")
      .uploadToSignedUrl(upload.path, upload.token, file, { contentType: "text/csv" });
    if (stored.error) throw new UploadError("storage_unavailable", "The CSV upload failed.");
  }
  onProgress?.(80);
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/dataset/inspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...upload, ...options }),
  });
  if (!response.ok) return responseError(response, "Narra could not inspect this CSV.");
  const parsed = previewSchema.safeParse(await response.json());
  if (!parsed.success) throw new UploadError("invalid_response", "The CSV preview was invalid.");
  onProgress?.(100);
  return { preview: parsed.data, upload };
}

export function uploadDataset(
  projectId: string,
  upload: DatasetUpload,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
  options: CsvImportOptions,
): Promise<DatasetAnalysis> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);
    xhr.open("POST", `/api/projects/${encodeURIComponent(projectId)}/dataset/preview`);
    xhr.timeout = 90000;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
      cleanup();
      let payload: unknown;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        reject(new UploadError("invalid_response", "The server returned an unreadable response."));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const error = uploadErrorSchema.safeParse(payload);
        reject(
          new UploadError(
            error.success ? error.data.error.code : "upload_failed",
            error.success ? error.data.error.message : "The analysis failed. Please retry.",
            xhr.status,
          ),
        );
        return;
      }
      const parsed = analysisSchema.safeParse(payload);
      if (!parsed.success) {
        reject(new UploadError("invalid_response", "The server returned an invalid analysis."));
        return;
      }
      onProgress(100);
      resolve(parsed.data);
    };
    xhr.onerror = () => reject(new UploadError("network_error", "The analysis connection failed."));
    xhr.ontimeout = () => reject(new UploadError("timeout", "The analysis timed out."));
    xhr.onabort = () => reject(new DOMException("Upload canceled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    xhr.send(JSON.stringify({ ...upload, ...options }));
  });
}
