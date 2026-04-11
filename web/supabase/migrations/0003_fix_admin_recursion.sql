-- 0002 の admin ポリシーは members を再参照するため無限再帰を起こす
-- security definer 関数で RLS を回避しつつ admin 判定を行う

drop policy if exists members_admin_all on minanowa.members;
drop policy if exists events_admin_write on minanowa.events;
drop policy if exists event_reg_admin_all on minanowa.event_registrations;
drop policy if exists blogs_admin_write on minanowa.blogs;
drop policy if exists boards_admin_all on minanowa.boards;
drop policy if exists site_settings_admin_write on minanowa.site_settings;
drop policy if exists op_members_admin_write on minanowa.operating_members;

create or replace function minanowa.is_admin()
returns boolean
language sql
security definer
stable
set search_path = minanowa, public
as $$
  select coalesce(
    (select is_admin from minanowa.members where id = auth.uid()),
    false
  )
$$;

grant execute on function minanowa.is_admin() to anon, authenticated, service_role;

create policy members_admin_all on minanowa.members
  for all using (minanowa.is_admin()) with check (minanowa.is_admin());
create policy events_admin_write on minanowa.events
  for all using (minanowa.is_admin()) with check (minanowa.is_admin());
create policy event_reg_admin_all on minanowa.event_registrations
  for all using (minanowa.is_admin()) with check (minanowa.is_admin());
create policy blogs_admin_write on minanowa.blogs
  for all using (minanowa.is_admin()) with check (minanowa.is_admin());
create policy boards_admin_all on minanowa.boards
  for all using (minanowa.is_admin()) with check (minanowa.is_admin());
create policy site_settings_admin_write on minanowa.site_settings
  for all using (minanowa.is_admin()) with check (minanowa.is_admin());
create policy op_members_admin_write on minanowa.operating_members
  for all using (minanowa.is_admin()) with check (minanowa.is_admin());
