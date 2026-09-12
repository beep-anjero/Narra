// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const dataset = "33333333-3333-4333-8333-333333333333";
let db: PGlite;
let project: string;
let path: string;
const analysis = {
  preview: { row_count: 2, column_count: 1 },
  column_metadata: [
    { name: "Revenue", detected_type: "numeric", missing_count: 0, unique_count: 2 },
  ],
  recommendations: [
    {
      chart_type: "histogram",
      title: "Revenue",
      x_column: "Revenue",
      y_column: null,
      aggregation: "count",
    },
  ],
  insights: [
    {
      type: "distribution",
      title: "Test evidence",
      description: "Two values",
      severity: "info",
      metadata: {},
    },
  ],
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public,storage to authenticated,anon;
    grant execute on function auth.uid() to authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant select,insert,delete on storage.objects to authenticated;`);
  for (const name of [
    "20260907000100_auth_profiles.sql",
    "20260908000100_projects.sql",
    "20260913000100_datasets.sql",
  ])
    await db.exec(
      await readFile(new URL(`../../../supabase/migrations/${name}`, import.meta.url), "utf8"),
    );
  await db.query("insert into auth.users(id) values ($1),($2)", [alice, bob]);
  project = (
    await asUser(alice, () =>
      db.query<{ id: string }>(
        "insert into projects(user_id,name) values ($1,'Saved') returning id",
        [alice],
      ),
    )
  ).rows[0]!.id;
  path = `${alice}/${project}/${dataset}.csv`;
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function asUser<T>(user: string, call: () => Promise<T>) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try {
    return await call();
  } finally {
    await db.exec("reset role");
  }
}
const save = (value: unknown = analysis) =>
  db.query("select save_analysis($1,$2,$3,$4,$5)", [
    project,
    dataset,
    "sales.csv",
    50,
    JSON.stringify(value),
  ]);
it("rejects cross-user storage writes and saves", async () => {
  await expect(
    asUser(bob, () =>
      db.query("insert into storage.objects(bucket_id,name) values ('datasets',$1)", [path]),
    ),
  ).rejects.toThrow(/row-level security/);
  await expect(asUser(bob, () => save())).rejects.toThrow(/Project unavailable/);
});
it("requires a stored CSV, rolls back failed metadata, then saves all records atomically", async () => {
  await expect(asUser(alice, () => save())).rejects.toThrow(/Upload the CSV/);
  await asUser(alice, () =>
    db.query("insert into storage.objects(bucket_id,name) values ('datasets',$1)", [path]),
  );
  await expect(
    asUser(alice, () =>
      save({
        ...analysis,
        column_metadata: [{ ...analysis.column_metadata[0], detected_type: "invalid" }],
      }),
    ),
  ).rejects.toThrow();
  expect((await asUser(alice, () => db.query("select * from datasets"))).rows).toHaveLength(0);
  await asUser(alice, () => save());
  for (const table of [
    "datasets",
    "dataset_columns",
    "visualizations",
    "insights",
    "storage.objects",
  ]) {
    expect((await asUser(alice, () => db.query(`select * from ${table}`))).rows).toHaveLength(1);
    expect((await asUser(bob, () => db.query(`select * from ${table}`))).rows).toHaveLength(0);
    expect(
      (await asUser(bob, () => db.query(`delete from ${table} returning *`))).rows,
    ).toHaveLength(0);
  }
  await expect(asUser(alice, () => save())).rejects.toThrow(/duplicate key/);
});
it("prevents orphaning storage on project deletion, then cascades relational cleanup", async () => {
  await expect(
    asUser(alice, () => db.query("delete from projects where id=$1", [project])),
  ).rejects.toThrow(/Storage API/);
  // SQL emulates the Storage API metadata cleanup only inside this isolated policy test.
  await asUser(alice, () => db.query("delete from storage.objects where name=$1", [path]));
  await asUser(alice, () => db.query("delete from projects where id=$1", [project]));
  for (const table of ["datasets", "dataset_columns", "visualizations", "insights"])
    expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);
});
