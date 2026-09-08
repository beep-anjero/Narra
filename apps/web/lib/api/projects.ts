import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { projectIdSchema } from "@/features/projects/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function projectContext() {
  const user = await requireUser();
  const client = await createSupabaseServerClient();
  return { user, client };
}

export async function listProjects(page: number) {
  const { user, client } = await projectContext();
  const { data, error, count } = await client
    .from("projects")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .order("id")
    .range((page - 1) * 12, page * 12 - 1);
  if (error)
    throw new Error(
      "Narra could not load projects. Check the database connection and apply the projects migration.",
    );
  return { projects: data, count: count ?? 0 };
}

export async function getProject(id: string) {
  const { user, client } = await projectContext();
  if (!projectIdSchema.safeParse(id).success) notFound();
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Narra could not load this project. Check the database connection.");
  if (!data) notFound();
  return data;
}
