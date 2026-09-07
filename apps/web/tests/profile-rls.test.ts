// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  // Model only Supabase-owned prerequisites; execute Narra's real migration unchanged.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email text, created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to authenticated;
    insert into auth.users (id, email) values ('${alice}', 'alice@example.com');
  `);
  await db.exec(
    await readFile(
      new URL("../../../supabase/migrations/20260907000100_auth_profiles.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.query("insert into auth.users (id, email) values ($1, $2)", [bob, "bob@example.com"]);
}, 30000);
afterAll(async () => {
  await db?.close();
});

async function asRole<T>(
  role: "anon" | "authenticated",
  userId: string,
  operation: () => Promise<T>,
) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  try {
    return await operation();
  } finally {
    await db.exec("reset role");
  }
}

describe("profile migration and RLS in PostgreSQL", () => {
  it("backfills existing users and creates profiles for new auth users", async () => {
    const result = await db.query<{ id: string }>("select id from public.profiles order by id");
    expect(result.rows.map((row) => row.id)).toEqual([alice, bob]);
  });
  it.each([alice, bob])("allows user %s to see only their own row", async (userId) => {
    const result = await asRole("authenticated", userId, () =>
      db.query<{ id: string }>("select id from public.profiles"),
    );
    expect(result.rows).toEqual([{ id: userId }]);
  });
  it("returns no rows without an identity even under the authenticated role", async () => {
    const result = await asRole("authenticated", "", () =>
      db.query("select * from public.profiles"),
    );
    expect(result.rows).toEqual([]);
  });
  it("denies anonymous reads", async () => {
    await expect(
      asRole("anon", "", () => db.query("select * from public.profiles")),
    ).rejects.toThrow(/permission denied/);
  });
  it.each([
    "update public.profiles set email = 'attacker@example.com'",
    "delete from public.profiles",
    "insert into public.profiles (id, email) values ('33333333-3333-4333-8333-333333333333', 'attacker@example.com')",
  ])("denies direct profile writes: %s", async (sql) => {
    await expect(asRole("authenticated", alice, () => db.query(sql))).rejects.toThrow(
      /permission denied/,
    );
  });
  it("synchronizes confirmed Auth email changes and cascades Auth deletion", async () => {
    await db.query("update auth.users set email = $1 where id = $2", [
      "alice-new@example.com",
      alice,
    ]);
    const profile = await asRole("authenticated", alice, () =>
      db.query<{ email: string }>("select email from public.profiles"),
    );
    expect(profile.rows).toEqual([{ email: "alice-new@example.com" }]);
    await db.query("delete from auth.users where id = $1", [bob]);
    expect((await db.query("select * from public.profiles where id = $1", [bob])).rows).toEqual([]);
  });
  it("does not expose the security-definer function for client execution", async () => {
    const result = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('authenticated', 'public.sync_auth_profile()', 'execute') as allowed",
    );
    expect(result.rows[0]?.allowed).toBe(false);
  });
});
