begin;

create table public.datasets (
  id uuid primary key,
  project_id uuid not null unique references public.projects(id) on delete cascade,
  filename text not null,
  original_filename text not null,
  storage_path text not null unique,
  file_size bigint not null check (file_size between 1 and 104857600),
  row_count integer not null check (row_count > 0),
  column_count integer not null check (column_count between 1 and 200),
  analysis jsonb not null check (jsonb_typeof(analysis) = 'object'),
  created_at timestamptz not null default now()
);
create table public.dataset_columns (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  name text not null,
  position integer not null check (position >= 0),
  detected_type text not null check (detected_type in ('numeric','categorical','datetime','boolean','text')),
  nullable boolean not null,
  missing_count integer not null check (missing_count >= 0),
  unique_count integer not null check (unique_count >= 0),
  metadata jsonb not null,
  unique(dataset_id, position), unique(dataset_id, name)
);
create table public.visualizations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  chart_type text not null check (chart_type in ('line','bar','scatter','histogram','donut')),
  title text not null,
  x_column text not null,
  y_column text,
  aggregation text not null,
  configuration jsonb not null,
  position integer not null,
  created_at timestamptz not null default now(),
  unique(project_id, position)
);
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null,
  title text not null,
  description text not null,
  severity text not null check (severity in ('info','warning')),
  metadata jsonb not null,
  created_at timestamptz not null default now()
);
create index insights_project_idx on public.insights(project_id);

alter table public.datasets enable row level security;
alter table public.dataset_columns enable row level security;
alter table public.visualizations enable row level security;
alter table public.insights enable row level security;
revoke all on public.datasets, public.dataset_columns, public.visualizations, public.insights from public, anon, authenticated;
grant select, insert, delete on public.datasets, public.dataset_columns, public.visualizations, public.insights to authenticated;

create policy "Own datasets" on public.datasets for all to authenticated
  using (exists(select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  with check (exists(select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()))
    and storage_path = (select auth.uid())::text || '/' || project_id::text || '/' || id::text || '.csv');
create policy "Own columns" on public.dataset_columns for all to authenticated
  using (exists(select 1 from public.datasets d where d.id = dataset_id))
  with check (exists(select 1 from public.datasets d where d.id = dataset_id));
create policy "Own visualizations" on public.visualizations for all to authenticated
  using (exists(select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  with check (exists(select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())));
create policy "Own insights" on public.insights for all to authenticated
  using (exists(select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  with check (exists(select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('datasets','datasets',false,20971520,array['text/csv'])
on conflict (id) do update set public = false;

create policy "Upload own project CSV" on storage.objects for insert to authenticated
  with check (bucket_id = 'datasets' and split_part(name,'/',1) = (select auth.uid())::text
    and exists(select 1 from public.projects p where p.id::text = split_part(storage.objects.name,'/',2)
      and p.user_id = (select auth.uid())) and name ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+\.csv$');
create policy "Read own CSV" on storage.objects for select to authenticated
  using (bucket_id = 'datasets' and split_part(name,'/',1) = (select auth.uid())::text);
create policy "Delete own CSV" on storage.objects for delete to authenticated
  using (bucket_id = 'datasets' and split_part(name,'/',1) = (select auth.uid())::text);

create function public.save_analysis(p_project uuid, p_dataset uuid, p_filename text, p_size bigint, p_analysis jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare item jsonb; ordinal bigint; object_path text;
begin
  -- Serialize saves with project deletion and competing uploads.
  perform 1 from public.projects where id = p_project and user_id = auth.uid() for update;
  if not found then raise exception 'Project unavailable'; end if;
  object_path := auth.uid()::text || '/' || p_project::text || '/' || p_dataset::text || '.csv';
  if not exists(select 1 from storage.objects where bucket_id = 'datasets' and name = object_path) then
    raise exception 'Upload the CSV before saving its analysis';
  end if;
  insert into public.datasets(id,project_id,filename,original_filename,storage_path,file_size,row_count,column_count,analysis)
  values(p_dataset,p_project,p_dataset::text || '.csv',p_filename,object_path,p_size,
    (p_analysis->'preview'->>'row_count')::int,(p_analysis->'preview'->>'column_count')::int,p_analysis);
  for item, ordinal in select value, ordinality from jsonb_array_elements(p_analysis->'column_metadata') with ordinality loop
    insert into public.dataset_columns(dataset_id,name,position,detected_type,nullable,missing_count,unique_count,metadata)
    values(p_dataset,item->>'name',ordinal-1,item->>'detected_type',(item->>'missing_count')::int > 0,
      (item->>'missing_count')::int,(item->>'unique_count')::int,item);
  end loop;
  for item, ordinal in select value, ordinality from jsonb_array_elements(p_analysis->'recommendations') with ordinality loop
    insert into public.visualizations(project_id,chart_type,title,x_column,y_column,aggregation,configuration,position)
    values(p_project,item->>'chart_type',item->>'title',item->>'x_column',item->>'y_column',item->>'aggregation',item,ordinal-1);
  end loop;
  for item in select value from jsonb_array_elements(p_analysis->'insights') loop
    insert into public.insights(project_id,type,title,description,severity,metadata)
    values(p_project,item->>'type',item->>'title',item->>'description',item->>'severity',item->'metadata');
  end loop;
  update public.projects set name = name where id = p_project;
  return p_dataset;
end; $$;
revoke all on function public.save_analysis(uuid,uuid,text,bigint,jsonb) from public, anon;
grant execute on function public.save_analysis(uuid,uuid,text,bigint,jsonb) to authenticated;

create function public.require_storage_cleanup() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if exists(select 1 from storage.objects where bucket_id = 'datasets'
    and split_part(name,'/',1) = old.user_id::text and split_part(name,'/',2) = old.id::text) then
    raise exception 'Remove project files through the Storage API before deleting this project';
  end if;
  return old;
end; $$;
revoke all on function public.require_storage_cleanup() from public, anon, authenticated;
create trigger projects_storage_cleanup before delete on public.projects
  for each row execute function public.require_storage_cleanup();
commit;
