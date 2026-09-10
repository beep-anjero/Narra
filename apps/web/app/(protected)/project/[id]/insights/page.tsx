import Link from "next/link";
import { getProject } from "@/lib/api/projects";
import { uploadLimit } from "@/lib/api/analytics";
import { CsvUploader } from "@/features/upload/csv-uploader";

export const metadata = { title: "Dataset insights" };
export default async function ProjectInsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const project = await getProject((await params).id);
  return (
    <>
      <Link
        href={`/project/${project.id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Project overview
      </Link>
      <h1 className="mt-7 text-3xl font-semibold">Understand your data</h1>
      <p className="mt-3 break-words text-muted-foreground">
        {project.name} · Upload your CSV to generate traceable insights. Analysis remains temporary
        until datasets can be saved.
      </p>
      <CsvUploader projectId={project.id} maxBytes={uploadLimit()} />
    </>
  );
}
