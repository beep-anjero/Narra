"use client";
import { Button } from "@/components/ui/button";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <section className="py-12">
      <h1 className="text-2xl font-semibold">Your workspace could not be loaded</h1>
      <p role="alert" className="my-5 max-w-xl text-muted-foreground">
        Narra could not read your projects. Check your connection and retry. If this is a new
        installation, apply the projects database migration first.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
