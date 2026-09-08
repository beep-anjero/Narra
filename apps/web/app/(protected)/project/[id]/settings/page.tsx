import Link from "next/link";
import { getProject } from "@/lib/api/projects";
import { ProjectForm, DeleteProjectForm } from "@/features/projects/project-form";
export const metadata = { title: "Project settings" };
export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const project = await getProject((await params).id);
  return (
    <>
      <Link
        href={`/project/${project.id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to project
      </Link>
      <h1 className="mb-9 mt-7 text-3xl font-semibold">Project settings</h1>
      <ProjectForm project={project} />
      <section id="delete-project" className="mt-14 border-t pt-8">
        <h2 className="mb-4 text-xl font-semibold">Delete project</h2>
        <DeleteProjectForm id={project.id} />
      </section>
    </>
  );
}
