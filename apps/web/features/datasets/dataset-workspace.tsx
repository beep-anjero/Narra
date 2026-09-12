import Link from "next/link";
import { getSavedDataset } from "@/lib/api/saved-datasets";
import { uploadLimit } from "@/lib/api/analytics";
import { CsvUploader } from "@/features/upload/csv-uploader";

export async function DatasetWorkspace({
  projectId,
  view = "dashboard",
}: {
  projectId: string;
  view?: "dashboard" | "data" | "insights";
}) {
  const dataset = await getSavedDataset(projectId);
  return (
    <>
      <nav aria-label="Project sections" className="mt-6 flex flex-wrap gap-5 text-sm font-medium">
        {(
          [
            ["dashboard", "", "Dashboard"],
            ["data", "/data", "Data"],
            ["insights", "/insights", "Insights"],
            ["settings", "/settings", "Settings"],
          ] as const
        ).map(([key, path, label]) => (
          <Link
            key={key}
            href={`/project/${projectId}${path}`}
            aria-current={view === key ? "page" : undefined}
            className="text-primary underline underline-offset-4"
          >
            {label}
          </Link>
        ))}
      </nav>
      <CsvUploader
        projectId={projectId}
        maxBytes={uploadLimit()}
        initialAnalysis={dataset?.analysis}
        view={view}
      />
    </>
  );
}
