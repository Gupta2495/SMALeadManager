-- Shree Madhav Lead Tracker — Supabase schema
--
-- One service holds DB + Auth + RLS. The Python ingester (lead_tracker/*)
-- and the web app both read/write through this schema. Python uses the
-- service-role key (bypasses RLS); the web app uses user sessions and is
-- fully constrained by the policies below.
--
-- Apply via Supabase dashboard: SQL editor → paste this file → Run.
-- Or via CLI: `supabase db reset` if you manage the project with the CLI.

-- Extensions ----------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- Enums ---------------------------------------------------------------------
create type user_role as enum ('admin', 'caller');

create type lead_status as enum (
  'new',
  'contacted',
  'interested',
  'visited',
  'on_hold',
  'admitted',
  'rejected',
  'lost'
);

create type interaction_type as enum (
  'call',
  'whatsapp_in',
  'whatsapp_out',
  'note',
  'status_change',
  'visit'
);

create type call_outcome as enum (
  'no_answer',
  'busy',
  'interested',
  'not_interested',
  'callback_requested',
  'visit_scheduled',
  'admitted',
  'lost'
);

-- Profiles (extends auth.users) --------------------------------------------
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        user_role not null default 'caller',
  created_at  timestamptz not null default now()
);

-- Leads ---------------------------------------------------------------------
create table leads (
  id                uuid primary key default uuid_generate_v4(),
  lead_id           text unique,                          -- human code: LEAD-YYYYMMDD-NNN
  phone             text unique not null,                 -- normalized E.164-ish
  parent_name       text,
  student_name      text,
  class_label       text,                                 -- Nursery | LKG | UKG | 1..12
  interest          text,
  location          text,
  notes             text default '',
  status            lead_status not null default 'new',
  assigned_to       uuid references profiles (id) on delete set null,
  captured_at       timestamptz not null default now(),
  source_msg_date   timestamptz,
  source_message    text,
  source_from       text,
  confidence        numeric(4, 3),
  next_follow_up    timestamptz,
  follow_up_count   integer not null default 0,
  last_contact_at   timestamptz,
  last_outcome      call_outcome,
  needs_review      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index leads_phone_idx          on leads (phone);
create index leads_assigned_to_idx    on leads (assigned_to);
create index leads_status_idx         on leads (status);
create index leads_next_follow_up_idx on leads (next_follow_up);
create index leads_needs_review_idx   on leads (needs_review) where needs_review;

-- Interactions (== follow-ups, broadened) ----------------------------------
create table interactions (
  id               uuid primary key default uuid_generate_v4(),
  lead_id          uuid not null references leads (id) on delete cascade,
  type             interaction_type not null,
  outcome          call_outcome,
  channel          text,
  notes            text,
  duration_seconds integer,
  next_follow_up   timestamptz,
  created_by       uuid references profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index interactions_lead_id_idx    on interactions (lead_id);
create index interactions_created_at_idx on interactions (created_at desc);

-- Raw messages (ingester idempotency) --------------------------------------
create table raw_messages (
  msg_id            text primary key,
  msg_date          date,
  msg_time          time,
  sender            text,
  body              text,
  processed_at      timestamptz not null default now(),
  produced_lead_id  uuid references leads (id) on delete set null
);

-- updated_at trigger on leads ----------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_touch_updated_at
before update on leads
for each row execute function public.touch_updated_at();

-- Profile auto-provisioning on signup --------------------------------------
-- Note: signups are disabled at the project level for SMA. Admins add users
-- from the Supabase dashboard; this trigger still fires and creates their
-- profile row with role='caller'. Promote to admin by updating the profiles
-- row directly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    'caller'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Row-level security --------------------------------------------------------
alter table profiles     enable row level security;
alter table leads        enable row level security;
alter table interactions enable row level security;
alter table raw_messages enable row level security;

-- profiles
create policy "profiles: self select" on profiles
  for select
  using (auth.uid() = id);

create policy "profiles: admin select all" on profiles
  for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "profiles: admin update" on profiles
  for update
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- leads: admin full access
create policy "leads: admin all" on leads
  for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- leads: callers see their assigned leads + unclaimed leads
create policy "leads: caller select own or unclaimed" on leads
  for select
  using (
    assigned_to = auth.uid() or assigned_to is null
  );

-- leads: callers update their assigned leads or claim unassigned ones
create policy "leads: caller update own or unclaimed" on leads
  for update
  using (
    assigned_to = auth.uid() or assigned_to is null
  )
  with check (
    assigned_to = auth.uid() or assigned_to is null
  );

-- interactions: admin all
create policy "interactions: admin all" on interactions
  for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- interactions: callers read+write for leads they can see
create policy "interactions: caller select for visible leads" on interactions
  for select
  using (
    exists (
      select 1 from leads l
      where l.id = interactions.lead_id
        and (l.assigned_to = auth.uid() or l.assigned_to is null)
    )
  );

create policy "interactions: caller insert for visible leads" on interactions
  for insert
  with check (
    exists (
      select 1 from leads l
      where l.id = interactions.lead_id
        and (l.assigned_to = auth.uid() or l.assigned_to is null)
    )
  );

-- raw_messages: service-role only (Python ingester). No policy → no access
-- for regular users. The service-role key bypasses RLS entirely.
