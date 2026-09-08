// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
let projectId: string;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key, email text, created_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to authenticated,anon;
 grant execute on function auth.uid() to authenticated;`);
  for (const file of ["20260907000100_auth_profiles.sql", "20260908000100_projects.sql"]) {
    await db.exec(
      await readFile(new URL(`../../../supabase/migrations/${file}`, import.meta.url), "utf8"),
    );
  }
  await db.query("insert into auth.users(id) values ($1),($2)", [alice, bob]);
  const result = await asUser(alice, () =>
    db.query<{ id: string }>(
      "insert into projects(user_id,name) values ($1,'Sales') returning id",
      [alice],
    ),
  );
  projectId = result.rows[0]!.id;
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function asUser<T>(id: string, operation: () => Promise<T>, role = "authenticated") {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  try {
    return await operation();
  } finally {
    await db.exec("reset role");
  }
}
it("persists an owned project and defaults timestamps", async () => {
  const result = await asUser(alice, () =>
    db.query<{ id: string; created_at: Date }>("select * from projects"),
  );
  expect(result.rows[0]?.id).toBe(projectId);
  expect(result.rows[0]?.created_at).toBeTruthy();
});
it("hides projects from another account and missing identities", async () => {
  for (const user of [bob, ""])
    expect((await asUser(user, () => db.query("select * from projects"))).rows).toEqual([]);
});
it("denies anonymous reads", async () => {
  await expect(asUser("", () => db.query("select * from projects"), "anon")).rejects.toThrow(
    /permission denied/,
  );
});
it("rejects forged ownership on insert", async () => {
  await expect(
    asUser(bob, () => db.query("insert into projects(user_id,name) values ($1,'Stolen')", [alice])),
  ).rejects.toThrow(/row-level security/);
});
it("cannot rename or delete another user's project", async () => {
  for (const sql of [
    "update projects set name='Stolen' returning id",
    "delete from projects returning id",
  ])
    expect((await asUser(bob, () => db.query(sql))).rows).toEqual([]);
});
it("cannot transfer ownership or forge timestamps", async () => {
  for (const sql of [
    `update projects set user_id='${bob}'`,
    "update projects set created_at=now()",
    "update projects set updated_at=now()",
  ])
    await expect(asUser(alice, () => db.query(sql))).rejects.toThrow(/permission denied/);
});
it("enforces name constraints through direct database access", async () => {
  await expect(
    asUser(alice, () => db.query("insert into projects(user_id,name) values ($1,'   ')", [alice])),
  ).rejects.toThrow(/check constraint/);
});
it("allows owner rename and updates timestamp", async () => {
  const before = await db.query<{ updated_at: Date }>("select updated_at from projects");
  const result = await asUser(alice, () =>
    db.query<{ name: string; updated_at: Date }>(
      "update projects set name='New name',description='Saved' returning *",
    ),
  );
  expect(result.rows[0]?.name).toBe("New name");
  expect(new Date(result.rows[0]!.updated_at).getTime()).toBeGreaterThan(
    new Date(before.rows[0]!.updated_at).getTime(),
  );
});
it("allows owner deletion", async () => {
  expect((await asUser(alice, () => db.query("delete from projects returning id"))).rows).toEqual([
    { id: projectId },
  ]);
});
