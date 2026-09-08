import Link from "next/link";
import { getProject } from "@/lib/api/projects";
import { uploadLimit } from "@/lib/api/analytics";
import { CsvUploader } from "@/features/upload/csv-uploader";
export const metadata = { title: "Project overview" };
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const project = await getProject((await params).id);
  return (
    <>
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← All projects
      </Link>
      <h1 className="mt-7 break-words text-3xl font-semibold">{project.name}</h1>
      <p className="mt-3 max-w-2xl whitespace-pre-wrap break-words text-muted-foreground">
        {project.description || "No description added."}
      </p>
      <Link
        href={`/project/${project.id}/settings`}
        className="mt-6 inline-block text-primary underline"
      >
        Project settings
      </Link>
      <CsvUploader projectId={project.id} maxBytes={uploadLimit()} />
    </>
  );
}
