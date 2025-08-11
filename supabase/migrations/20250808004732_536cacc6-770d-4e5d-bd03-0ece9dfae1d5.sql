-- Enable required extension for UUID generation
create extension if not exists "pgcrypto";

-- Enums
create type public.user_role as enum ('solicitante', 'gestora', 'admin');
create type public.polo_name as enum ('3M Sumaré','3M Manaus','3M Ribeirão Preto','3M Itapetininga');
create type public.request_type as enum ('psicológico','médico','odontológico','fisioterapia','outros');
create type public.request_status as enum ('pending','approved','rejected');

-- Users table (application profiles)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'solicitante',
  department text,
  phone text,
  polo public.polo_name,
  privacy_consent boolean not null default false,
  privacy_consent_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Permissions per polo
create table if not exists public.user_polo_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  polo public.polo_name not null,
  granted_by uuid references public.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, polo)
);

alter table public.user_polo_permissions enable row level security;

-- Requests table
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.request_type not null,
  description text,
  amount numeric(12,2) not null,
  status public.request_status not null default 'pending',
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  polo public.polo_name not null,
  attachments text[] not null default '{}'::text[],
  dependents jsonb not null default '[]'::jsonb,
  invoices jsonb not null default '[]'::jsonb,
  cpf text not null
);

alter table public.requests enable row level security;

-- Invoices metadata table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_size integer,
  mime_type text,
  uploaded_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

-- Comments table (minimal for deletion function)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

-- Audit logs table (minimal for deletion function)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- Update timestamp trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Attach triggers
create or replace trigger trg_users_updated_at
before update on public.users
for each row execute function public.update_updated_at_column();

create or replace trigger trg_requests_updated_at
before update on public.requests
for each row execute function public.update_updated_at_column();

-- Helper: current app user id (from auth)
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id from public.users u where u.auth_id = auth.uid();
$$;

-- Helper: current user role
create or replace function public.get_current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select u.role from public.users u where u.auth_id = auth.uid();
$$;

-- Helper: polos allowed for current user
create or replace function public.allowed_polos_for_user(_uid uuid)
returns public.polo_name[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result public.polo_name[] := '{}';
begin
  -- Own polo
  select array_remove(array_agg(u.polo), null) into result
  from public.users u
  where u.auth_id = _uid;

  -- Additional permissions
  result := coalesce(result, '{}') || coalesce(
    (
      select array_agg(upp.polo)
      from public.user_polo_permissions upp
      join public.users u2 on u2.id = upp.user_id
      where u2.auth_id = _uid
    ),
    '{}'
  );

  -- Remove duplicates
  select array_agg(distinct p) from unnest(result) p into result;
  return coalesce(result, '{}');
end;
$$;

-- Helper: can access request
create or replace function public.can_access_request(_request_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  req record;
  cur_user_id uuid;
  cur_role public.user_role;
  polos public.polo_name[];
begin
  select * into req from public.requests where id = _request_id;
  if not found then
    return false;
  end if;

  select public.current_app_user_id() into cur_user_id;
  select public.get_current_user_role() into cur_role;
  select public.allowed_polos_for_user(auth.uid()) into polos;

  if cur_role = 'admin' then
    return true;
  end if;

  if req.user_id = cur_user_id then
    return true;
  end if;

  if cur_role = 'gestora' and req.polo = any(polos) then
    return true;
  end if;

  return false;
end;
$$;

-- RLS Policies
-- Users
create policy if not exists "Users: owners can select" on public.users
for select to authenticated
using (auth.uid() = auth_id or public.get_current_user_role() = 'admin');

create policy if not exists "Users: owners can update" on public.users
for update to authenticated
using (auth.uid() = auth_id or public.get_current_user_role() = 'admin')
with check (auth.uid() = auth_id or public.get_current_user_role() = 'admin');

-- No direct inserts by clients (handled by trigger), but allow admins if needed
create policy if not exists "Users: admins can insert" on public.users
for insert to authenticated
with check (public.get_current_user_role() = 'admin');

-- user_polo_permissions
create policy if not exists "Permissions: owners can select" on public.user_polo_permissions
for select to authenticated
using (user_id = public.current_app_user_id() or public.get_current_user_role() = 'admin');

create policy if not exists "Permissions: only admins can insert" on public.user_polo_permissions
for insert to authenticated
with check (public.get_current_user_role() = 'admin');

create policy if not exists "Permissions: only admins can delete" on public.user_polo_permissions
for delete to authenticated
using (public.get_current_user_role() = 'admin');

-- requests
create policy if not exists "Requests: owners can select" on public.requests
for select to authenticated
using (user_id = public.current_app_user_id());

create policy if not exists "Requests: admins can select" on public.requests
for select to authenticated
using (public.get_current_user_role() = 'admin');

create policy if not exists "Requests: gestoras can select by polo" on public.requests
for select to authenticated
using (public.get_current_user_role() = 'gestora' and polo = any(public.allowed_polos_for_user(auth.uid())));

create policy if not exists "Requests: owners can insert" on public.requests
for insert to authenticated
with check (user_id = public.current_app_user_id());

create policy if not exists "Requests: admins can update" on public.requests
for update to authenticated
using (public.get_current_user_role() = 'admin');

create policy if not exists "Requests: gestoras can update by polo" on public.requests
for update to authenticated
using (public.get_current_user_role() = 'gestora' and polo = any(public.allowed_polos_for_user(auth.uid())));

create policy if not exists "Requests: owners can update own" on public.requests
for update to authenticated
using (user_id = public.current_app_user_id());

-- invoices
create policy if not exists "Invoices: access by related request" on public.invoices
for select to authenticated
using (public.can_access_request(request_id));

create policy if not exists "Invoices: insert by related request" on public.invoices
for insert to authenticated
with check (public.can_access_request(request_id));

create policy if not exists "Invoices: delete by related request" on public.invoices
for delete to authenticated
using (public.can_access_request(request_id));

-- comments
create policy if not exists "Comments: access by related request" on public.comments
for select to authenticated
using (public.can_access_request(request_id));

create policy if not exists "Comments: insert by related request" on public.comments
for insert to authenticated
with check (public.can_access_request(request_id));

create policy if not exists "Comments: delete by related request" on public.comments
for delete to authenticated
using (public.can_access_request(request_id));

-- audit_logs
create policy if not exists "Audit: owners and admins can select" on public.audit_logs
for select to authenticated
using (user_id = public.current_app_user_id() or public.get_current_user_role() = 'admin');

-- Trigger to create a profile row on auth user signup
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_id, name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email, coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'solicitante'))
  on conflict (auth_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('request-attachments', 'request-attachments', true)
on conflict (id) do nothing;

-- Storage RLS policies for invoices
create policy if not exists "Storage: public read invoices" on storage.objects
for select to public
using (bucket_id = 'invoices');

create policy if not exists "Storage: users upload invoices" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'invoices' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy if not exists "Storage: users update own invoices" on storage.objects
for update to authenticated
using (
  bucket_id = 'invoices' and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'invoices' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy if not exists "Storage: users delete own invoices" on storage.objects
for delete to authenticated
using (
  bucket_id = 'invoices' and auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage RLS policies for request-attachments
create policy if not exists "Storage: public read request-attachments" on storage.objects
for select to public
using (bucket_id = 'request-attachments');

create policy if not exists "Storage: users upload request-attachments" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'request-attachments' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy if not exists "Storage: users update own request-attachments" on storage.objects
for update to authenticated
using (
  bucket_id = 'request-attachments' and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'request-attachments' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy if not exists "Storage: users delete own request-attachments" on storage.objects
for delete to authenticated
using (
  bucket_id = 'request-attachments' and auth.uid()::text = (storage.foldername(name))[1]
);

-- Indexes for performance
create index if not exists idx_requests_user_id on public.requests(user_id);
create index if not exists idx_requests_polo on public.requests(polo);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_invoices_request_id on public.invoices(request_id);

-- Realtime setup
alter table public.requests replica identity full;
alter table public.invoices replica identity full;
alter table public.comments replica identity full;

-- Add to realtime publication if not already present
alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.invoices;
alter publication supabase_realtime add table public.comments;