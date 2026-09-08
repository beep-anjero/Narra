"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { projectContext } from "@/lib/api/projects";
import { projectIdSchema, projectSchema, type ProjectFormState } from "./schemas";

export async function saveProject(
  _state: ProjectFormState,
  form: FormData,
): Promise<ProjectFormState> {
  const { user, client } = await projectContext();
  const parsed = projectSchema.safeParse({
    name: form.get("name"),
    description: form.get("description") ?? "",
  });
  if (!parsed.success)
    return { message: parsed.error.issues[0]?.message ?? "Check your project details." };
  const id = form.get("id");
  if (id !== null && !projectIdSchema.safeParse(id).success)
    return { message: "Invalid project ID." };
  let savedId: string;
  try {
    const values = { ...parsed.data, description: parsed.data.description || null };
    const query =
      typeof id === "string"
        ? client.from("projects").update(values).eq("id", id).eq("user_id", user.id)
        : client.from("projects").insert({ ...values, user_id: user.id });
    const { data, error } = await query.select("id").maybeSingle();
    if (error)
      return {
        message:
          "Could not save the project. Check the database connection and ensure the projects migration is applied.",
      };
    if (!data) return { message: "This project is unavailable or you no longer have access." };
    savedId = data.id;
  } catch {
    return {
      message:
        "Could not reach the database. Your changes were not confirmed; retry when the connection returns.",
    };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/project/${savedId}`, "layout");
  if (id) return { success: true, message: "Project details saved." };
  redirect(`/project/${savedId}`);
}

export async function deleteProject(
  _state: ProjectFormState,
  form: FormData,
): Promise<ProjectFormState> {
  const { user, client } = await projectContext();
  const id = projectIdSchema.safeParse(form.get("id"));
  if (!id.success) return { message: "Invalid project ID." };
  if (form.get("confirmation") !== "DELETE")
    return { message: "Type DELETE to confirm project deletion." };
  try {
    const { data, error } = await client
      .from("projects")
      .delete()
      .eq("id", id.data)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error)
      return {
        message: "Could not delete the project. Please retry when the database is available.",
      };
    if (!data) return { message: "This project is unavailable or has already been deleted." };
  } catch {
    return {
      message: "Could not reach the database. Refresh to check whether the project was deleted.",
    };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/project/${id.data}`, "layout");
  redirect("/dashboard?notice=deleted");
}
