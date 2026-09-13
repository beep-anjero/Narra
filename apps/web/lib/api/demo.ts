import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { demoNameSchema, type DemoName } from "@/features/demo/catalog";
import type { FilterRequest } from "@/features/filters/contracts";
import { UploadError, type DatasetAnalysis } from "@/features/upload/contracts";
import { analyzeDataset, filterDataset } from "./analytics";

// Only these five public, synthetic inputs are available through the demo route.
const cached = new Map<DemoName, Promise<DatasetAnalysis>>();
export async function demoCsv(name: DemoName) {
  demoNameSchema.parse(name);
  return readFile(path.resolve(process.cwd(), "../../sample-data", `${name}.csv`));
}
export async function filterDemo(name: DemoName, request: FilterRequest) {
  const index = demoNameSchema.options.indexOf(name) + 1;
  const scope = {
    userId: "00000000-0000-4000-8000-000000000000",
    projectId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  };
  const fresh = () => {
    const promise = demoCsv(name).then((content) =>
      analyzeDataset(Uint8Array.from(content).buffer, `${name}.csv`, "text/csv", scope),
    );
    cached.set(name, promise);
    promise.catch(() => {
      if (cached.get(name) === promise) cached.delete(name);
    });
    return promise;
  };
  let analysis = await (cached.get(name) ?? fresh());
  if (!request.filters.length) return analysis;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!analysis.filter_context?.token)
      throw new UploadError(
        "demo_unavailable",
        "Demo filtering is temporarily unavailable. The original dashboard is still available.",
        503,
      );
    try {
      return await filterDataset({ ...request, token: analysis.filter_context.token }, scope);
    } catch (error) {
      if (!(error instanceof UploadError) || error.status !== 410 || attempt) throw error;
      analysis = await fresh();
    }
  }
  throw new UploadError("demo_unavailable", "Please retry demo filtering.", 503);
}
