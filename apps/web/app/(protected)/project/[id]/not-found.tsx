import Link from "next/link";
export default function ProjectNotFound() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Project unavailable</h1>
      <p className="my-5 text-muted-foreground">
        This project does not exist or is not available to your account.
      </p>
      <Link href="/dashboard" className="text-primary underline">
        Back to your projects
      </Link>
    </>
  );
}
