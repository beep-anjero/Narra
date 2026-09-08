import Link from "next/link";
import { getProject } from "@/lib/api/projects";
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
      <section className="mt-10 rounded-xl border bg-card p-8 sm:p-12">
        <p className="text-sm font-medium text-primary">PROJECT SAVED</p>
        <h2 className="mt-3 text-2xl font-semibold">Ready for your data</h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Your project is saved to your account. CSV upload and automatic analysis are coming in the
          next release stages. You can return here anytime or update your project details.
        </p>
      </section>
    </>
  );
}
