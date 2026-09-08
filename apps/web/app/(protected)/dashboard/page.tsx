import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listProjects } from "@/lib/api/projects";
export const metadata = { title: "Your projects" };
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const raw = Number(parameters.page);
  const page = Number.isSafeInteger(raw) && raw > 0 && raw < 100000 ? raw : 1;
  const { projects, count } = await listProjects(page);
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-2 text-sm font-medium text-primary">YOUR WORKSPACE</p>
          <h1 className="text-4xl font-semibold tracking-tight">Your projects</h1>
          <p className="mt-3 text-muted-foreground">A home for the questions behind your data.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new">New Analysis</Link>
        </Button>
      </div>
      {parameters.notice === "deleted" && (
        <p role="status" className="mt-6 text-primary">
          Project deleted.
        </p>
      )}
      {parameters.notice === "logout_failed" && (
        <p role="alert" className="mt-6 text-destructive">
          Narra could not complete logout. Please try again.
        </p>
      )}
      {projects.length === 0 ? (
        <Card className="mt-10 shadow-none">
          <CardContent className="py-16 text-center">
            <h2 className="text-2xl font-semibold">
              {count ? "No projects on this page" : "Start with a question"}
            </h2>
            <p className="mt-3 text-muted-foreground">
              Create a project and give your next analysis a place to grow.
            </p>
            <Button asChild className="mt-6">
              <Link href={count ? "/dashboard" : "/dashboard/new"}>
                {count ? "Back to projects" : "Create your first project"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="shadow-none">
              <CardContent className="flex h-full flex-col p-6">
                <h2 className="break-words text-xl font-semibold">
                  <Link href={`/project/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </h2>
                <p className="mt-2 line-clamp-2 break-words text-sm text-muted-foreground">
                  {project.description || "No description added."}
                </p>
                <p className="mt-5 text-sm text-muted-foreground">No dataset attached</p>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p>
                    Created:{" "}
                    <time dateTime={project.created_at}>{project.created_at.slice(0, 10)}</time>
                  </p>
                  <p>
                    Updated:{" "}
                    <time dateTime={project.updated_at}>{project.updated_at.slice(0, 10)}</time>
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap gap-4 pt-6 text-sm font-medium">
                  <Link href={`/project/${project.id}`} className="text-primary hover:underline">
                    Open
                  </Link>
                  <Link href={`/project/${project.id}/settings`} className="hover:underline">
                    Rename
                  </Link>
                  <Link
                    href={`/project/${project.id}/settings#delete-project`}
                    className="text-destructive hover:underline"
                  >
                    Delete
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {count > 12 && (
        <nav aria-label="Project pages" className="mt-8 flex gap-6">
          {page > 1 && <Link href={`/dashboard?page=${page - 1}`}>Previous</Link>}
          <span>Page {page}</span>
          {page * 12 < count && <Link href={`/dashboard?page=${page + 1}`}>Next</Link>}
        </nav>
      )}
    </>
  );
}
