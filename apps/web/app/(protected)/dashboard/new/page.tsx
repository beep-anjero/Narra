import Link from "next/link";
import { ProjectForm } from "@/features/projects/project-form";
export const metadata = { title: "New project" };
export default function NewProjectPage() {
  return (
    <>
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← All projects
      </Link>
      <h1 className="mt-7 text-3xl font-semibold">Create a project</h1>
      <p className="mb-9 mt-3 text-muted-foreground">
        Give your analysis a name. You can upload and preview a CSV after creating the project.
      </p>
      <ProjectForm />
    </>
  );
}
