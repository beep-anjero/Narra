import Link from "next/link";
import { getProject } from "@/lib/api/projects";
import { uploadLimit } from "@/lib/api/analytics";
import { CsvUploader } from "@/features/upload/csv-uploader";

export const metadata = { title: "Dataset preview" };

export default async function ProjectDataPage({ params }: { params: Promise<{ id: string }> }) {
  const project = await getProject((await params).id);
  return (
    <>
      <Link
        href={`/project/${project.id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Project overview
      </Link>
      <h1 className="mt-7 text-3xl font-semibold">Explore your dataset</h1>
      <p className="mt-3 break-words text-muted-foreground">
        {project.name} · Upload a CSV to inspect its values, columns, and statistics. Uploaded data
        is temporary and must be uploaded again after navigating away.
      </p>
      <CsvUploader projectId={project.id} maxBytes={uploadLimit()} />
    </>
  );
}
