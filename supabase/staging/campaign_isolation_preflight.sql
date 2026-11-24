-- Local/isolated staging preflight only. Do not run against a live database.
-- Memberships are provisioned by a trusted operator, never from user metadata.
begin;
create schema stigg_campaign;
revoke all on schema stigg_campaign from public, anon, authenticated;
grant usage on schema stigg_campaign to authenticated;

create table stigg_campaign.workspace (
  id uuid primary key,
  label text not null check (char_length(label) between 1 and 140)
);
create table stigg_campaign.membership (
  workspace_id uuid not null references stigg_campaign.workspace(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('operator', 'reviewer')),
  primary key (workspace_id, user_id)
);
create table stigg_campaign.contact_preview (
  workspace_id uuid not null references stigg_campaign.workspace(id) on delete cascade,
  email text not null check (email = lower(btrim(email))
    and email ~ '^[a-z0-9._%+-]+@example\.(com|net|org)$'),
  stage text not null check (stage in ('lead', 'customer')),
  primary key (workspace_id, email)
);
alter table stigg_campaign.workspace enable row level security;
alter table stigg_campaign.membership enable row level security;
alter table stigg_campaign.contact_preview enable row level security;

revoke all on all tables in schema stigg_campaign from public, anon, authenticated;
grant select on stigg_campaign.workspace, stigg_campaign.contact_preview to authenticated;

create function stigg_campaign.is_member(target_workspace uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from stigg_campaign.membership m
    where m.workspace_id = target_workspace and m.user_id = auth.uid()
  )
$$;
revoke all on function stigg_campaign.is_member(uuid) from public, anon, authenticated;
grant execute on function stigg_campaign.is_member(uuid) to authenticated;

create policy workspace_read on stigg_campaign.workspace
  for select to authenticated using (stigg_campaign.is_member(id));
create policy contact_read on stigg_campaign.contact_preview
  for select to authenticated using (stigg_campaign.is_member(workspace_id));
-- No client-side writes and no anon access. Tables accept synthetic data only.
commit;
