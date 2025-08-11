-- Fix security warnings by setting proper search_path for functions

-- Drop and recreate handle_new_user function with proper security
drop function if exists public.handle_new_user();
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

-- Drop and recreate update_updated_at_column function with proper security
drop function if exists public.update_updated_at_column();
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Drop and recreate log_request_status_change function with proper security
drop function if exists public.log_request_status_change();
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