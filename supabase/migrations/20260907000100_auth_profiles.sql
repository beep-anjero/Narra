begin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Email and identity are owned by Supabase Auth, not editable profile fields.
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create function public.sync_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, created_at)
  values (new.id, new.email, coalesce(new.created_at, now()))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

revoke all on function public.sync_auth_profile() from public, anon, authenticated;

create trigger on_auth_user_profile_changed
  after insert or update of email on auth.users
  for each row execute function public.sync_auth_profile();

-- Also support projects where Auth users were created before this migration.
insert into public.profiles (id, email, created_at)
select id, email, coalesce(created_at, now()) from auth.users
on conflict (id) do nothing;

commit;
