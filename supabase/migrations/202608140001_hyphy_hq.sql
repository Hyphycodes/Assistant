-- Hyphy HQ relational core. Apply with `supabase db reset` or your managed Postgres migration runner.
create extension if not exists pgcrypto;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  timezone text not null default 'America/Chicago', created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspace_members (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('owner','assistant')),
  display_name text, status text not null default 'active' check (status in ('invited','active','suspended','removed')),
  created_at timestamptz not null default now(), unique(workspace_id,user_id)
);
create unique index one_active_owner_per_workspace on public.workspace_members(workspace_id) where role='owner' and status='active';

create or replace function public.is_workspace_member(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members m where m.workspace_id=target and m.user_id=auth.uid() and m.status='active')
$$;
create or replace function public.is_workspace_owner(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members m where m.workspace_id=target and m.user_id=auth.uid() and m.role='owner' and m.status='active')
$$;
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_owner(uuid) from public;
grant execute on function public.is_workspace_member(uuid), public.is_workspace_owner(uuid) to authenticated;

create table public.things (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null, summary text, category text not null check(category in ('personal','shopping','trips','business','creative','future')),
  status text not null check(status in ('inbox','exploring','moving','waiting','needs_you','ready','done','someday')),
  permission_level text not null check(permission_level in ('go','approve','you')), keep_moving boolean not null default false,
  surprise_me boolean not null default false, archived_at timestamptz, completed_at timestamptz, created_by uuid references auth.users(id),
  last_meaningful_activity_at timestamptz default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index things_workspace_status_idx on public.things(workspace_id,status);
create index things_workspace_category_idx on public.things(workspace_id,category);
create index things_workspace_activity_idx on public.things(workspace_id,last_meaningful_activity_at desc);

create table public.thing_dates (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid not null references public.things(id) on delete cascade, label text not null, start_at timestamptz, end_at timestamptz,
  date_precision text not null check(date_precision in ('exact','day','range','month','season','unknown')), is_deadline boolean not null default false,
  source text, created_at timestamptz not null default now()
);
create table public.thing_sections (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid not null references public.things(id) on delete cascade, section_type text not null, title text not null,
  position integer not null default 0, payload jsonb not null default '{}', schema_version integer not null default 1,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.thing_notes (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid not null references public.things(id) on delete cascade, body text not null, author_id uuid references auth.users(id),
  source text not null default 'manual', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.thing_links (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid not null references public.things(id) on delete cascade, url text not null, title text, domain text,
  preview_image_url text, source text, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.inbox_items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id), input_type text not null check(input_type in ('text','voice','photo','link','file')),
  raw_text text, status text not null check(status in ('received','processing','needs_review','accepted','attached','dismissed','failed')),
  source_metadata jsonb not null default '{}', idempotency_key text, created_at timestamptz not null default now(), processed_at timestamptz,
  unique(workspace_id,idempotency_key)
);
create table public.inbox_attachments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  inbox_item_id uuid not null references public.inbox_items(id) on delete cascade, storage_path text not null, mime_type text not null,
  byte_size bigint check(byte_size is null or byte_size >= 0), checksum text, transcript text, created_at timestamptz not null default now()
);
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_type text not null, provider text, model text, input_hash text, status text not null check(status in ('queued','running','succeeded','failed','cancelled')),
  input_payload jsonb, output_payload jsonb, error_code text, started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now()
);
create table public.inbox_proposals (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  inbox_item_id uuid not null references public.inbox_items(id) on delete cascade,
  proposal_type text not null check(proposal_type in ('new_thing','attach_thing','extract_note','create_approval','create_follow_up')),
  target_thing_id uuid references public.things(id), payload jsonb not null, schema_version integer not null default 1,
  confidence numeric(4,3) check(confidence between 0 and 1), review_status text not null check(review_status in ('pending','accepted','edited','rejected')),
  created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references auth.users(id)
);
create table public.activity_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid references public.things(id) on delete cascade, actor_type text not null check(actor_type in ('owner','assistant','system','ai','integration')),
  actor_id uuid references auth.users(id), event_type text not null, public_text text not null, private_metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table public.thing_messages (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid not null references public.things(id) on delete cascade, author_type text not null check(author_type in ('owner','assistant','ai','system')),
  author_id uuid references auth.users(id), body text not null, message_metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.approvals (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid references public.things(id) on delete cascade, requested_by uuid references auth.users(id), action_type text not null,
  permission_level text not null check(permission_level in ('approve','you')), title text not null, recommendation text, details jsonb not null default '{}',
  status text not null default 'pending' check(status in ('pending','approved','rejected','held','edited','expired','cancelled')),
  resolved_by uuid references auth.users(id), resolved_at timestamptz, created_at timestamptz not null default now()
);
create table public.approval_actions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  approval_id uuid not null references public.approvals(id) on delete cascade, actor_id uuid references auth.users(id),
  action text not null, payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, organization text, role_or_context text, phone text, email text, location text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.thing_contacts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade, thing_id uuid not null references public.things(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade, relationship text, primary key(thing_id,contact_id)
);
create table public.thing_options (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid not null references public.things(id) on delete cascade, option_type text not null, name text not null, description text,
  price numeric check(price is null or price >= 0), currency text default 'USD', source_url text, image_url text, pros jsonb, cons jsonb,
  assistant_recommendation text, status text not null default 'considering', metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thing_id uuid references public.things(id), option_id uuid references public.thing_options(id),
  order_status text not null check(order_status in ('planned','approved','ordered','shipped','delivered','returned','cancelled')),
  order_reference text, ordered_at timestamptz, expected_at timestamptz, delivered_at timestamptz, return_by timestamptz,
  source_url text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.integration_connections (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null, status text not null check(status in ('connected','disconnected','error','revoked')),
  scopes jsonb not null default '[]', encrypted_credentials_ref text, last_synced_at timestamptz,
  created_at timestamptz not null default now(), unique(workspace_id,provider)
);

-- Every tenant table uses the same membership boundary. More restrictive policies follow for sensitive records.
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.things enable row level security;
alter table public.thing_dates enable row level security;
alter table public.thing_sections enable row level security;
alter table public.thing_notes enable row level security;
alter table public.thing_links enable row level security;
alter table public.inbox_items enable row level security;
alter table public.inbox_attachments enable row level security;
alter table public.ai_runs enable row level security;
alter table public.inbox_proposals enable row level security;
alter table public.activity_events enable row level security;
alter table public.thing_messages enable row level security;
alter table public.approvals enable row level security;
alter table public.approval_actions enable row level security;
alter table public.contacts enable row level security;
alter table public.thing_contacts enable row level security;
alter table public.thing_options enable row level security;
alter table public.orders enable row level security;
alter table public.integration_connections enable row level security;

create policy workspace_member_read on public.workspaces for select using(public.is_workspace_member(id));
create policy workspace_owner_update on public.workspaces for update using(public.is_workspace_owner(id)) with check(public.is_workspace_owner(id));
create policy members_read on public.workspace_members for select using(public.is_workspace_member(workspace_id));
create policy members_owner_manage on public.workspace_members for all using(public.is_workspace_owner(workspace_id)) with check(public.is_workspace_owner(workspace_id));

do $$ declare t text; begin
  foreach t in array array['things','thing_dates','thing_sections','thing_notes','thing_links','inbox_items','inbox_attachments','ai_runs','inbox_proposals','activity_events','thing_messages','contacts','thing_contacts','thing_options','orders'] loop
    execute format('create policy member_read_%1$s on public.%1$I for select using(public.is_workspace_member(workspace_id))', t);
    execute format('create policy member_insert_%1$s on public.%1$I for insert with check(public.is_workspace_member(workspace_id))', t);
    execute format('create policy member_update_%1$s on public.%1$I for update using(public.is_workspace_member(workspace_id)) with check(public.is_workspace_member(workspace_id))', t);
    execute format('create policy owner_delete_%1$s on public.%1$I for delete using(public.is_workspace_owner(workspace_id))', t);
  end loop;
end $$;

create policy approvals_member_read on public.approvals for select using(public.is_workspace_member(workspace_id));
create policy approvals_member_prepare on public.approvals for insert with check(public.is_workspace_member(workspace_id) and status='pending');
create policy approvals_owner_resolve on public.approvals for update using(public.is_workspace_owner(workspace_id)) with check(public.is_workspace_owner(workspace_id));
create policy approval_actions_member_read on public.approval_actions for select using(public.is_workspace_member(workspace_id));
create policy approval_actions_owner_write on public.approval_actions for insert with check(public.is_workspace_owner(workspace_id) and actor_id=auth.uid());
create policy integrations_member_read on public.integration_connections for select using(public.is_workspace_member(workspace_id));
create policy integrations_owner_manage on public.integration_connections for all using(public.is_workspace_owner(workspace_id)) with check(public.is_workspace_owner(workspace_id));

create trigger workspaces_touch before update on public.workspaces for each row execute function public.touch_updated_at();
create trigger things_touch before update on public.things for each row execute function public.touch_updated_at();
create trigger sections_touch before update on public.thing_sections for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.thing_notes for each row execute function public.touch_updated_at();
create trigger contacts_touch before update on public.contacts for each row execute function public.touch_updated_at();
