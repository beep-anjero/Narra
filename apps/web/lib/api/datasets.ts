import {
  previewSchema,
  uploadErrorSchema,
  UploadError,
  type DatasetPreview,
} from "@/features/upload/contracts";

export function uploadDataset(
  projectId: string,
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<DatasetPreview> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);
    xhr.open("POST", `/api/projects/${encodeURIComponent(projectId)}/dataset/preview`);
    xhr.timeout = 90000;
    xhr.setRequestHeader("X-Filename", encodeURIComponent(file.name));
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      cleanup();
      let payload: unknown;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        reject(
          new UploadError(
            "invalid_response",
            "The server returned an unreadable response. Check its upload limit and try again.",
          ),
        );
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const error = uploadErrorSchema.safeParse(payload);
        reject(
          new UploadError(
            error.success ? error.data.error.code : "upload_failed",
            error.success ? error.data.error.message : "The upload failed. Please retry.",
            xhr.status,
          ),
        );
        return;
      }
      const parsed = previewSchema.safeParse(payload);
      if (!parsed.success) {
        reject(new UploadError("invalid_response", "The server returned an invalid preview."));
        return;
      }
      resolve(parsed.data);
    };
    xhr.onerror = () => {
      cleanup();
      reject(
        new UploadError(
          "network_error",
          "The upload connection failed. Check your connection and retry.",
        ),
      );
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(
        new UploadError(
          "timeout",
          "The upload timed out. Try a smaller CSV or retry when the service is available.",
        ),
      );
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Upload canceled", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      cleanup();
      reject(new DOMException("Upload canceled", "AbortError"));
      return;
    }
    xhr.send(file);
  });
}
