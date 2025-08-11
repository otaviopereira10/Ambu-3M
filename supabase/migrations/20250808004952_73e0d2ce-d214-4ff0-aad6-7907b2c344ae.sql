-- Fix policies creation: drop then create to avoid duplicates

-- Users
drop policy if exists "Users: owners can select" on public.users;
drop policy if exists "Users: owners can update" on public.users;
drop policy if exists "Users: admins can insert" on public.users;

create policy "Users: owners can select" on public.users
for select to authenticated
using (auth.uid() = auth_id or public.get_current_user_role() = 'admin');

create policy "Users: owners can update" on public.users
for update to authenticated
using (auth.uid() = auth_id or public.get_current_user_role() = 'admin')
with check (auth.uid() = auth_id or public.get_current_user_role() = 'admin');

create policy "Users: admins can insert" on public.users
for insert to authenticated
with check (public.get_current_user_role() = 'admin');

-- user_polo_permissions
drop policy if exists "Permissions: owners can select" on public.user_polo_permissions;
drop policy if exists "Permissions: only admins can insert" on public.user_polo_permissions;
drop policy if exists "Permissions: only admins can delete" on public.user_polo_permissions;

create policy "Permissions: owners can select" on public.user_polo_permissions
for select to authenticated
using (user_id = public.current_app_user_id() or public.get_current_user_role() = 'admin');

create policy "Permissions: only admins can insert" on public.user_polo_permissions
for insert to authenticated
with check (public.get_current_user_role() = 'admin');

create policy "Permissions: only admins can delete" on public.user_polo_permissions
for delete to authenticated
using (public.get_current_user_role() = 'admin');

-- requests
drop policy if exists "Requests: owners can select" on public.requests;
drop policy if exists "Requests: admins can select" on public.requests;
drop policy if exists "Requests: gestoras can select by polo" on public.requests;
drop policy if exists "Requests: owners can insert" on public.requests;
drop policy if exists "Requests: admins can update" on public.requests;
drop policy if exists "Requests: gestoras can update by polo" on public.requests;
drop policy if exists "Requests: owners can update own" on public.requests;

create policy "Requests: owners can select" on public.requests
for select to authenticated
using (user_id = public.current_app_user_id());

create policy "Requests: admins can select" on public.requests
for select to authenticated
using (public.get_current_user_role() = 'admin');

create policy "Requests: gestoras can select by polo" on public.requests
for select to authenticated
using (public.get_current_user_role() = 'gestora' and polo = any(public.allowed_polos_for_user(auth.uid())));

create policy "Requests: owners can insert" on public.requests
for insert to authenticated
with check (user_id = public.current_app_user_id());

create policy "Requests: admins can update" on public.requests
for update to authenticated
using (public.get_current_user_role() = 'admin');

create policy "Requests: gestoras can update by polo" on public.requests
for update to authenticated
using (public.get_current_user_role() = 'gestora' and polo = any(public.allowed_polos_for_user(auth.uid())));

create policy "Requests: owners can update own" on public.requests
for update to authenticated
using (user_id = public.current_app_user_id());

-- invoices
drop policy if exists "Invoices: access by related request" on public.invoices;
drop policy if exists "Invoices: insert by related request" on public.invoices;
drop policy if exists "Invoices: delete by related request" on public.invoices;

create policy "Invoices: access by related request" on public.invoices
for select to authenticated
using (public.can_access_request(request_id));

create policy "Invoices: insert by related request" on public.invoices
for insert to authenticated
with check (public.can_access_request(request_id));

create policy "Invoices: delete by related request" on public.invoices
for delete to authenticated
using (public.can_access_request(request_id));

-- comments
drop policy if exists "Comments: access by related request" on public.comments;
drop policy if exists "Comments: insert by related request" on public.comments;
drop policy if exists "Comments: delete by related request" on public.comments;

create policy "Comments: access by related request" on public.comments
for select to authenticated
using (public.can_access_request(request_id));

create policy "Comments: insert by related request" on public.comments
for insert to authenticated
with check (public.can_access_request(request_id));

create policy "Comments: delete by related request" on public.comments
for delete to authenticated
using (public.can_access_request(request_id));

-- audit_logs
drop policy if exists "Audit: owners and admins can select" on public.audit_logs;
create policy "Audit: owners and admins can select" on public.audit_logs
for select to authenticated
using (user_id = public.current_app_user_id() or public.get_current_user_role() = 'admin');