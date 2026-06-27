-- Trumbull Atlas: initial schema (Phase 1 foundation)
-- Postgres / Supabase. Safe to apply to a fresh project.
-- Design notes:
--   * Subtasks are tasks (self-reference via parent_task_id), so one set of rules/policies.
--   * Ordering uses fractional string indexes with COLLATE "C" (correct lexical sort).
--   * "Blocked" is a first-class state separate from workflow columns.
--   * Effort: estimate_minutes + actual derived from started_at/completed_at (+ optional actual_minutes).
--   * Every tracked table feeds an append-only audit log (who/what/when).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;      -- gen_random_uuid()

-- ===========================================================================
-- PROFILES (1:1 with auth.users)
-- ===========================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        text not null default 'member' check (role in ('admin','member')),
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Auto-create a profile when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- PROJECTS
-- ===========================================================================
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  -- 'standard' = normal Kanban project; 'audit' = coverage-tracked audit project.
  kind         text not null default 'standard' check (kind in ('standard','audit')),
  objective    text,                          -- the measurable "done means..." statement
  color        text default '#6366f1',
  archived     boolean not null default false,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.projects enable row level security;

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'editor' check (role in ('owner','editor','viewer')),
  primary key (project_id, user_id)
);
create index on public.project_members (user_id);
alter table public.project_members enable row level security;

-- ===========================================================================
-- STATUSES (kanban columns, per project)
-- ===========================================================================
create table public.statuses (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name       text not null,
  color      text default '#94a3b8',
  position   text collate "C" not null,       -- fractional index
  is_done    boolean not null default false
);
create index on public.statuses (project_id, position);
alter table public.statuses enable row level security;

-- ===========================================================================
-- TASKS (subtasks are tasks via parent_task_id)
-- ===========================================================================
create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  parent_task_id  uuid references public.tasks(id) on delete cascade,
  status_id       uuid references public.statuses(id) on delete set null,
  title           text not null,
  description     text,
  priority        smallint check (priority between 1 and 4),  -- 1=ASAP/P1 .. 4=Low
  position        text collate "C" not null,
  due_date        date,
  -- scheduling inputs / actuals
  estimate_minutes integer,
  actual_minutes   integer,
  started_at       timestamptz,
  completed_at     timestamptz,
  -- first-class blocked state
  is_blocked       boolean not null default false,
  blocked_reason   text,
  blocked_since    timestamptz,
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.tasks (project_id, status_id, position);
create index on public.tasks (parent_task_id);
create index on public.tasks (due_date);
alter table public.tasks enable row level security;

-- A single accountable owner is enforced at the app layer via the first
-- task_assignees row flagged is_owner; additional assignees allowed.
create table public.task_assignees (
  task_id  uuid not null references public.tasks(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  is_owner boolean not null default false,
  primary key (task_id, user_id)
);
create index on public.task_assignees (user_id);
alter table public.task_assignees enable row level security;

-- ===========================================================================
-- LABELS, COMMENTS, ATTACHMENTS
-- ===========================================================================
create table public.labels (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name       text not null,
  color      text default '#64748b'
);
alter table public.labels enable row level security;

create table public.task_labels (
  task_id  uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (task_id, label_id)
);
alter table public.task_labels enable row level security;

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  author_id  uuid not null references public.profiles(id),
  body       text not null,
  created_at timestamptz not null default now()
);
create index on public.comments (task_id);
alter table public.comments enable row level security;

create table public.attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  storage_path text not null,
  file_name   text not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);
alter table public.attachments enable row level security;

-- ===========================================================================
-- AUDIT / COVERAGE MODEL
-- For kind='audit' projects: a defined universe of items, each verified.
-- ===========================================================================
create table public.audit_items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  external_ref text,                           -- SKU / listing id / URL
  title       text not null,
  marketplace text,                            -- Amazon / Walmart / Wayfair / ...
  -- coverage status: not a yes/no toggle on the project, but per item
  status      text not null default 'pending'
                check (status in ('pending','in_progress','verified','flagged','na')),
  owner_id    uuid references public.profiles(id),
  notes       text,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.audit_items (project_id, status);
alter table public.audit_items enable row level security;

-- ===========================================================================
-- updated_at maintenance
-- ===========================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger trg_projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger trg_tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- AUTHORIZATION HELPERS  (SECURITY DEFINER avoids RLS recursion)
-- ===========================================================================
create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ===========================================================================
-- RLS POLICIES  (members read/write within their projects; admins see all)
-- ===========================================================================
create policy "profiles self read"   on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated using (id = (select auth.uid()));

create policy "projects member read" on public.projects for select to authenticated
  using (public.is_project_member(id) or public.is_admin());
create policy "projects insert"      on public.projects for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "projects member write" on public.projects for update to authenticated
  using (public.is_project_member(id) or public.is_admin());

create policy "members read"  on public.project_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_project_member(project_id) or public.is_admin());
create policy "members manage" on public.project_members for all to authenticated
  using (public.is_admin() or public.is_project_member(project_id))
  with check (public.is_admin() or public.is_project_member(project_id));

-- Generic per-project policies for child tables.
create policy "statuses rw"   on public.statuses     for all to authenticated
  using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy "tasks rw"      on public.tasks         for all to authenticated
  using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy "labels rw"     on public.labels        for all to authenticated
  using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy "audit rw"      on public.audit_items   for all to authenticated
  using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));

create policy "assignees rw"  on public.task_assignees for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)));
create policy "task_labels rw" on public.task_labels for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)));
create policy "comments rw"   on public.comments      for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)));
create policy "attachments rw" on public.attachments  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)));

-- ===========================================================================
-- APPEND-ONLY AUDIT LOG (who / what / when) in a locked-down schema
-- ===========================================================================
create schema if not exists audit;

create table audit.audit_log (
  id           bigint generated always as identity primary key,
  ts           timestamptz not null default clock_timestamp(),
  table_name   text not null,
  op           text not null,
  record_pk    text,
  old_record   jsonb,
  new_record   jsonb,
  actor_id     uuid,
  actor_email  text
);

create or replace function audit.log_change()
returns trigger language plpgsql security definer set search_path = public, audit as $$
declare
  v_actor uuid := (select auth.uid());
  v_email text;
begin
  select email into v_email from public.profiles where id = v_actor;
  insert into audit.audit_log(table_name, op, record_pk, old_record, new_record, actor_id, actor_email)
  values (
    tg_table_name, tg_op,
    coalesce(new.id::text, old.id::text),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    v_actor, v_email
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_projects   after insert or update or delete on public.projects    for each row execute function audit.log_change();
create trigger audit_tasks       after insert or update or delete on public.tasks       for each row execute function audit.log_change();
create trigger audit_audit_items after insert or update or delete on public.audit_items for each row execute function audit.log_change();

-- Append-only: app roles may not modify history.
revoke insert, update, delete, truncate on audit.audit_log from anon, authenticated;
alter table audit.audit_log enable row level security;
create policy "audit read" on audit.audit_log for select to authenticated using (true);
