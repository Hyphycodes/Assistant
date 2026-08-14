-- Flexible, persistent Hyphy HQ object system.

alter table public.things
  add column if not exists parent_id uuid references public.things(id) on delete set null,
  add column if not exists subtitle text,
  add column if not exists description text,
  add column if not exists icon text,
  add column if not exists cover_url text,
  add column if not exists owner_profile_id uuid references auth.users(id),
  add column if not exists collaborators jsonb not null default '[]',
  add column if not exists priority text check(priority is null or priority in ('low','normal','high')),
  add column if not exists start_date timestamptz,
  add column if not exists end_date timestamptz,
  add column if not exists target_date timestamptz,
  add column if not exists location_text text,
  add column if not exists budget_amount numeric check(budget_amount is null or budget_amount >= 0),
  add column if not exists budget_currency text default 'USD',
  add column if not exists tags jsonb not null default '[]';
create index if not exists things_parent_idx on public.things(parent_id);
create index if not exists things_updated_idx on public.things(workspace_id,updated_at desc);

alter table public.thing_sections
  add column if not exists description text,
  add column if not exists collapsed_default boolean not null default false,
  add column if not exists icon text,
  add column if not exists archived_at timestamptz;

create table if not exists public.thing_relationships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_thing_id uuid not null references public.things(id) on delete cascade,
  target_thing_id uuid not null references public.things(id) on delete cascade,
  relationship_type text not null default 'related', created_at timestamptz not null default now(),
  primary key(source_thing_id,target_thing_id), check(source_thing_id <> target_thing_id)
);
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid not null references public.things(id) on delete cascade, section_id uuid references public.thing_sections(id) on delete set null,
  item_type text not null, title text not null, body text, status text, owner_profile_id uuid references auth.users(id),
  linked_contact_id uuid references public.contacts(id) on delete set null, linked_thing_id uuid references public.things(id) on delete set null,
  url text, due_at timestamptz, position integer not null default 0, metadata jsonb not null default '{}',
  archived_at timestamptz, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists items_thing_position_idx on public.items(thing_id,position);

create table if not exists public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid references public.things(id) on delete cascade, template_id uuid,
  label text not null, field_key text not null, field_type text not null,
  options jsonb not null default '[]', required boolean not null default false, position integer not null default 0, created_at timestamptz not null default now(),
  unique(thing_id,field_key)
);
create table if not exists public.custom_field_values (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  definition_id uuid not null references public.custom_field_definitions(id) on delete cascade,
  thing_id uuid not null references public.things(id) on delete cascade, value jsonb, updated_at timestamptz not null default now(),
  unique(definition_id,thing_id)
);
create table if not exists public.preferences (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid references auth.users(id), domain text not null, attribute text not null, statement text not null,
  sentiment text not null check(sentiment in ('likes','dislikes','neutral')), source_entity_type text, source_entity_id uuid,
  confidence numeric(4,3) check(confidence is null or confidence between 0 and 1), confirmed boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(), workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null, description text, template_type text not null, structure jsonb not null default '{}', archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.workspace_snapshots (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  revision bigint not null default 1, state jsonb not null, updated_at timestamptz not null default now()
);

alter table public.thing_relationships enable row level security;
alter table public.items enable row level security;
alter table public.custom_field_definitions enable row level security;
alter table public.custom_field_values enable row level security;
alter table public.preferences enable row level security;
alter table public.templates enable row level security;
alter table public.workspace_snapshots enable row level security;

do $$ declare t text; begin
  foreach t in array array['thing_relationships','items','custom_field_definitions','custom_field_values','preferences','templates','workspace_snapshots'] loop
    execute format('create policy member_read_%1$s on public.%1$I for select using(public.is_workspace_member(workspace_id))', t);
    execute format('create policy member_insert_%1$s on public.%1$I for insert with check(public.is_workspace_member(workspace_id))', t);
    execute format('create policy member_update_%1$s on public.%1$I for update using(public.is_workspace_member(workspace_id)) with check(public.is_workspace_member(workspace_id))', t);
    execute format('create policy owner_delete_%1$s on public.%1$I for delete using(public.is_workspace_owner(workspace_id))', t);
  end loop;
end $$;

create trigger items_touch before update on public.items for each row execute function public.touch_updated_at();
create trigger templates_touch before update on public.templates for each row execute function public.touch_updated_at();
