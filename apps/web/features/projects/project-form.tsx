"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProject, deleteProject } from "./actions";
import type { Database } from "@/types/database";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export function ProjectForm({ project }: { project?: Project }) {
  const [state, action, pending] = useActionState(saveProject, {});
  return (
    <form action={action} className="max-w-xl space-y-6">
      {project && <input type="hidden" name="id" value={project.id} />}
      <fieldset disabled={pending} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Project name</Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={project?.name}
            placeholder="e.g. Quarterly sales"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">
            Description <span className="text-muted-foreground">(optional)</span>
          </Label>
          <textarea
            id="description"
            name="description"
            maxLength={2000}
            defaultValue={project?.description ?? ""}
            rows={4}
            className="w-full rounded-md border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            placeholder="What would you like to understand?"
          />
        </div>
        <Button type="submit">
          {pending ? "Saving…" : project ? "Save changes" : "Create project"}
        </Button>
      </fieldset>
      {state.message && (
        <p
          role={state.success ? "status" : "alert"}
          className={state.success ? "text-primary" : "text-destructive"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function DeleteProjectForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteProject, {});
  return (
    <form action={action} className="max-w-xl space-y-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-muted-foreground">
        Deleting this project is permanent. Type DELETE to confirm.
      </p>
      <Label htmlFor="confirmation">Confirm deletion</Label>
      <Input
        id="confirmation"
        name="confirmation"
        required
        pattern="DELETE"
        autoComplete="off"
        disabled={pending}
      />
      <Button variant="destructive" disabled={pending}>
        {pending ? "Deleting…" : "Delete project"}
      </Button>
      {state.message && (
        <p role="alert" className="text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
