import Link from "next/link";
import { getProject } from "@/lib/api/projects";
import { DatasetWorkspace } from "@/features/datasets/dataset-workspace";
export const metadata = { title: "Understand your data" };
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const project = await getProject((await params).id);
  return (
    <>
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← All projects
      </Link>
      <h1 className="mt-7 break-words text-3xl font-semibold">{project.name}</h1>
      <p className="mt-3 max-w-2xl whitespace-pre-wrap break-words text-muted-foreground">
        Explore deterministic findings and the calculations behind them.
      </p>
      <DatasetWorkspace projectId={project.id} view="insights" />
    </>
  );
}
