-- Drop triggers first, then recreate functions and triggers with proper security

-- Drop all triggers
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists update_users_updated_at on public.users;
drop trigger if exists update_requests_updated_at on public.requests;
drop trigger if exists audit_request_changes on public.requests;

-- Drop and recreate functions with proper search_path
drop function if exists public.handle_new_user() cascade;
drop function if exists public.update_updated_at_column() cascade;
drop function if exists public.log_request_status_change() cascade;

-- Recreate handle_new_user function with proper security
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
$$ language plpgsql security definer set search_path = public;

-- Recreate update_updated_at_column function with proper security
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Recreate log_request_status_change function with proper security
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
$$ language plpgsql security definer set search_path = public;

-- Recreate all triggers
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger update_users_updated_at
  before update on public.users
  for each row execute procedure public.update_updated_at_column();

create trigger update_requests_updated_at
  before update on public.requests
  for each row execute procedure public.update_updated_at_column();

create trigger audit_request_changes
  after update on public.requests
  for each row execute procedure public.log_request_status_change();