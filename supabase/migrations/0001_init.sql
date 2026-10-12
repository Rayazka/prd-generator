-- Initial application schema. Supabase supplies auth.users, auth.uid(), and API roles.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled project' check (length(btrim(title)) > 0),
  idea_raw text not null check (length(btrim(idea_raw)) >= 50),
  language text not null default 'id' check (language in ('id', 'en')),
  status text not null default 'drafting'
    check (status in ('drafting', 'qa', 'part-a', 'part-b', 'phases', 'done')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.qa_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  questions jsonb not null
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 5 and 8),
  answers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= jsonb_array_length(questions)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prd_parts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  part_a_md text,
  part_a_json jsonb check (jsonb_typeof(part_a_json) = 'object'),
  summary_plain text,
  stack_choice text check (stack_choice in ('custom', 'recommended')),
  stack_detail jsonb check (jsonb_typeof(stack_detail) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (name in ('MVP', 'V1', 'V2')),
  sort integer not null default 0 check (sort >= 0),
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name),
  unique (id, project_id)
);

create table public.features (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  desc_plain text not null check (length(btrim(desc_plain)) > 0),
  desc_tech text not null default '',
  priority text not null check (priority in ('P0', 'P1', 'P2')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  sort integer not null default 0 check (sort >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A phase_id cannot reference a phase from a different project, even for the same owner.
  foreign key (phase_id, project_id) references public.phases (id, project_id) on delete cascade
);

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null check (type in ('md', 'pdf')),
  content_text text,
  file_path text,
  created_at timestamptz not null default now(),
  check (
    (type = 'md' and content_text is not null and file_path is null)
    or (type = 'pdf' and content_text is null and length(btrim(file_path)) > 0 and file_path is not null)
  )
);

create table public.user_keys (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  provider text not null default 'openai' check (length(btrim(provider)) > 0),
  key_enc text not null check (length(btrim(key_enc)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_updated_at_idx on public.projects (user_id, updated_at desc);
create index features_phase_id_sort_idx on public.features (phase_id, sort);
create index features_project_id_idx on public.features (project_id);
create index exports_project_id_created_at_idx on public.exports (project_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger qa_batches_updated_at before update on public.qa_batches
  for each row execute function public.set_updated_at();
create trigger prd_parts_updated_at before update on public.prd_parts
  for each row execute function public.set_updated_at();
create trigger phases_updated_at before update on public.phases
  for each row execute function public.set_updated_at();
create trigger features_updated_at before update on public.features
  for each row execute function public.set_updated_at();
create trigger user_keys_updated_at before update on public.user_keys
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

-- Signup must establish the profile before owner-scoped projects can be created.
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- These are trigger functions, not public RPC endpoints.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.qa_batches enable row level security;
alter table public.prd_parts enable row level security;
alter table public.phases enable row level security;
alter table public.features enable row level security;
alter table public.exports enable row level security;
alter table public.user_keys enable row level security;

-- Explicit grants keep behavior identical with or without Supabase's default privileges.
revoke all on table
  public.profiles, public.projects, public.qa_batches, public.prd_parts,
  public.phases, public.features, public.exports, public.user_keys
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.profiles, public.projects, public.qa_batches, public.prd_parts,
  public.phases, public.features, public.exports, public.user_keys
to authenticated, service_role;

create policy profiles_owner_all on public.profiles
for all to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy projects_owner_all on public.projects
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy qa_batches_owner_all on public.qa_batches
for all to authenticated
using (exists (
  select 1 from public.projects p where p.id = qa_batches.project_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.projects p where p.id = qa_batches.project_id and p.user_id = (select auth.uid())
));

create policy prd_parts_owner_all on public.prd_parts
for all to authenticated
using (exists (
  select 1 from public.projects p where p.id = prd_parts.project_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.projects p where p.id = prd_parts.project_id and p.user_id = (select auth.uid())
));

create policy phases_owner_all on public.phases
for all to authenticated
using (exists (
  select 1 from public.projects p where p.id = phases.project_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.projects p where p.id = phases.project_id and p.user_id = (select auth.uid())
));

create policy features_owner_all on public.features
for all to authenticated
using (exists (
  select 1 from public.projects p where p.id = features.project_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.projects p where p.id = features.project_id and p.user_id = (select auth.uid())
));

create policy exports_owner_all on public.exports
for all to authenticated
using (exists (
  select 1 from public.projects p where p.id = exports.project_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.projects p where p.id = exports.project_id and p.user_id = (select auth.uid())
));

create policy user_keys_owner_all on public.user_keys
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
