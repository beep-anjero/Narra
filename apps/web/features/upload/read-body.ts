import { UploadError } from "./contracts";

export async function readUploadBody(request: Request, maxBytes: number): Promise<ArrayBuffer> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > maxBytes)
    throw new UploadError("file_too_large", "This CSV exceeds the upload size limit.", 413);
  if (!request.body) throw new UploadError("empty_file", "This CSV is empty.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new UploadError("file_too_large", "This CSV exceeds the upload size limit.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!total) throw new UploadError("empty_file", "This CSV is empty.");
  const content = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    content.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return content.buffer;
}
