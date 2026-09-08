begin;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text check (char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_updated_idx on public.projects (user_id, updated_at desc, id);
alter table public.projects enable row level security;
revoke all on public.projects from public, anon, authenticated;
grant select, delete on public.projects to authenticated;
grant insert (user_id, name, description) on public.projects to authenticated;
grant update (name, description) on public.projects to authenticated;

create policy "Read own projects" on public.projects for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Create own projects" on public.projects for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own projects" on public.projects for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own projects" on public.projects for delete to authenticated
  using ((select auth.uid()) = user_id);

create function public.touch_project_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
revoke all on function public.touch_project_updated_at() from public, anon, authenticated;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.touch_project_updated_at();
commit;
