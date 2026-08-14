-- Safe seed path: create demo Auth users first in local Supabase with these emails.
-- No password or production identity is committed. UI fixtures live in src/lib/seed.ts.
do $$
declare owner_id uuid; assistant_id uuid; workspace_id uuid := '11111111-1111-4111-8111-111111111111';
begin
  select id into owner_id from auth.users where email='jerry.demo@hyphy.local' limit 1;
  select id into assistant_id from auth.users where email='maria.demo@hyphy.local' limit 1;
  if owner_id is null or assistant_id is null then
    raise notice 'Skipping relational seed: create jerry.demo@hyphy.local and maria.demo@hyphy.local in local Auth first.';
    return;
  end if;
  insert into public.workspaces(id,name,slug,timezone,created_by) values(workspace_id,'Hyphy HQ Demo','hyphy-hq-demo','America/Chicago',owner_id) on conflict do nothing;
  insert into public.workspace_members(workspace_id,user_id,role,display_name,status) values
    (workspace_id,owner_id,'owner','Jerry','active'), (workspace_id,assistant_id,'assistant','Maria','active') on conflict do nothing;
end $$;
