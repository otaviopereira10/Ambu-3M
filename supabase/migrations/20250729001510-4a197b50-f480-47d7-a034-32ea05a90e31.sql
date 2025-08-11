-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create custom types
create type user_role as enum ('solicitante', 'gestora');
create type request_status as enum ('pending', 'approved', 'rejected');
create type request_type as enum ('psicológico', 'médico', 'odontológico', 'fisioterapia', 'outros');

-- Users table
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text unique not null,
  role user_role not null default 'solicitante',
  department text,
  phone text,
  privacy_consent boolean not null default false,
  privacy_consent_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Requests table
create table public.requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  type request_type not null,
  description text not null,
  amount numeric(12,2) not null,
  status request_status not null default 'pending',
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoices/Documents table
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references public.requests(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_size bigint,
  mime_type text,
  uploaded_at timestamptz default now()
);

-- Comments table
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references public.requests(id) on delete cascade not null,
  user_id uuid references public.users(id) not null,
  comment text not null,
  is_internal boolean not null default false,
  created_at timestamptz default now()
);

-- Audit logs table
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references public.requests(id),
  user_id uuid references public.users(id),
  action text not null,
  old_values jsonb,
  new_values jsonb,
  timestamp timestamptz default now()
);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.requests enable row level security;
alter table public.invoices enable row level security;
alter table public.comments enable row level security;
alter table public.audit_logs enable row level security;

-- Create storage bucket for invoices
insert into storage.buckets (id, name, public) values ('invoices', 'invoices', false);

-- RLS Policies for users
create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = auth_id);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = auth_id);

create policy "Gestoras can view all users" on public.users
  for select using (
    exists(select 1 from public.users where auth_id = auth.uid() and role = 'gestora')
  );

-- RLS Policies for requests
create policy "Users can view their own requests" on public.requests
  for select using (
    user_id in (select id from public.users where auth_id = auth.uid())
  );

create policy "Users can create their own requests" on public.requests
  for insert with check (
    user_id in (select id from public.users where auth_id = auth.uid())
  );

create policy "Gestoras can view all requests" on public.requests
  for select using (
    exists(select 1 from public.users where auth_id = auth.uid() and role = 'gestora')
  );

create policy "Gestoras can update requests" on public.requests
  for update using (
    exists(select 1 from public.users where auth_id = auth.uid() and role = 'gestora')
  );

-- RLS Policies for invoices
create policy "Users can view their own invoices" on public.invoices
  for select using (
    request_id in (
      select r.id from public.requests r
      join public.users u on r.user_id = u.id
      where u.auth_id = auth.uid()
    )
  );

create policy "Users can upload invoices for their requests" on public.invoices
  for insert with check (
    request_id in (
      select r.id from public.requests r
      join public.users u on r.user_id = u.id
      where u.auth_id = auth.uid()
    )
  );

create policy "Gestoras can view all invoices" on public.invoices
  for select using (
    exists(select 1 from public.users where auth_id = auth.uid() and role = 'gestora')
  );

-- RLS Policies for comments
create policy "Users can view comments on their requests" on public.comments
  for select using (
    request_id in (
      select r.id from public.requests r
      join public.users u on r.user_id = u.id
      where u.auth_id = auth.uid()
    ) or
    exists(select 1 from public.users where auth_id = auth.uid() and role = 'gestora')
  );

create policy "Users can create comments" on public.comments
  for insert with check (
    user_id in (select id from public.users where auth_id = auth.uid())
  );

-- RLS Policies for audit logs
create policy "Gestoras can view audit logs" on public.audit_logs
  for select using (
    exists(select 1 from public.users where auth_id = auth.uid() and role = 'gestora')
  );

-- Storage policies for invoices
create policy "Users can upload invoices" on storage.objects
  for insert with check (
    bucket_id = 'invoices' and
    auth.uid() is not null
  );

create policy "Users can view their own invoices" on storage.objects
  for select using (
    bucket_id = 'invoices' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Gestoras can view all invoices" on storage.objects
  for select using (
    bucket_id = 'invoices' and
    exists(select 1 from public.users where auth_id = auth.uid() and role = 'gestora')
  );

-- Function to create user profile after signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (auth_id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'solicitante'::user_role)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create user profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_users_updated_at
  before update on public.users
  for each row execute procedure public.update_updated_at_column();

create trigger update_requests_updated_at
  before update on public.requests
  for each row execute procedure public.update_updated_at_column();

-- Function to log request status changes
create or replace function public.log_request_status_change()
returns trigger as $$
begin
  if old.status != new.status then
    insert into public.audit_logs (request_id, user_id, action, old_values, new_values)
    values (
      new.id,
      (select id from public.users where auth_id = auth.uid()),
      'status_change',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'approved_by', new.approved_by, 'rejection_reason', new.rejection_reason)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for audit log
create trigger audit_request_changes
  after update on public.requests
  for each row execute procedure public.log_request_status_change();