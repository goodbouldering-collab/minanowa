-- RLS ポリシー (minanowa スキーマ)
-- 方針:
--   - 公開メンバー (is_public=true) は誰でも read 可
--   - イベント・ブログは全員 read 可
--   - 書き込み系は認証ユーザーのみ。管理操作は is_admin=true のみ
--   - メンバー本人は自身のレコードを更新可

-- ============================================================
-- members
-- ============================================================
alter table minanowa.members enable row level security;

drop policy if exists members_public_read on minanowa.members;
create policy members_public_read on minanowa.members
  for select
  using (is_public = true);

drop policy if exists members_self_read on minanowa.members;
create policy members_self_read on minanowa.members
  for select
  using (auth.uid() = id);

drop policy if exists members_self_update on minanowa.members;
create policy members_self_update on minanowa.members
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists members_admin_all on minanowa.members;
create policy members_admin_all on minanowa.members
  for all
  using (
    exists (
      select 1 from minanowa.members m
      where m.id = auth.uid() and m.is_admin = true
    )
  );

-- ============================================================
-- events
-- ============================================================
alter table minanowa.events enable row level security;

drop policy if exists events_public_read on minanowa.events;
create policy events_public_read on minanowa.events
  for select
  using (true);

drop policy if exists events_admin_write on minanowa.events;
create policy events_admin_write on minanowa.events
  for all
  using (
    exists (
      select 1 from minanowa.members m
      where m.id = auth.uid() and m.is_admin = true
    )
  );

-- ============================================================
-- event_registrations
-- ============================================================
alter table minanowa.event_registrations enable row level security;

drop policy if exists event_reg_public_read on minanowa.event_registrations;
create policy event_reg_public_read on minanowa.event_registrations
  for select
  using (true);

drop policy if exists event_reg_self_insert on minanowa.event_registrations;
create policy event_reg_self_insert on minanowa.event_registrations
  for insert
  with check (auth.uid() = member_id or member_id is null);

drop policy if exists event_reg_self_delete on minanowa.event_registrations;
create policy event_reg_self_delete on minanowa.event_registrations
  for delete
  using (auth.uid() = member_id);

drop policy if exists event_reg_admin_all on minanowa.event_registrations;
create policy event_reg_admin_all on minanowa.event_registrations
  for all
  using (
    exists (
      select 1 from minanowa.members m
      where m.id = auth.uid() and m.is_admin = true
    )
  );

-- ============================================================
-- blogs
-- ============================================================
alter table minanowa.blogs enable row level security;

drop policy if exists blogs_public_read on minanowa.blogs;
create policy blogs_public_read on minanowa.blogs
  for select
  using (true);

drop policy if exists blogs_admin_write on minanowa.blogs;
create policy blogs_admin_write on minanowa.blogs
  for all
  using (
    exists (
      select 1 from minanowa.members m
      where m.id = auth.uid() and m.is_admin = true
    )
  );

-- ============================================================
-- boards
-- ============================================================
alter table minanowa.boards enable row level security;

drop policy if exists boards_public_read on minanowa.boards;
create policy boards_public_read on minanowa.boards
  for select
  using (true);

drop policy if exists boards_auth_insert on minanowa.boards;
create policy boards_auth_insert on minanowa.boards
  for insert
  with check (auth.uid() = author_id);

drop policy if exists boards_self_update on minanowa.boards;
create policy boards_self_update on minanowa.boards
  for update
  using (auth.uid() = author_id);

drop policy if exists boards_self_delete on minanowa.boards;
create policy boards_self_delete on minanowa.boards
  for delete
  using (auth.uid() = author_id);

drop policy if exists boards_admin_all on minanowa.boards;
create policy boards_admin_all on minanowa.boards
  for all
  using (
    exists (
      select 1 from minanowa.members m
      where m.id = auth.uid() and m.is_admin = true
    )
  );

-- ============================================================
-- board_replies
-- ============================================================
alter table minanowa.board_replies enable row level security;

drop policy if exists board_replies_public_read on minanowa.board_replies;
create policy board_replies_public_read on minanowa.board_replies
  for select
  using (true);

drop policy if exists board_replies_auth_insert on minanowa.board_replies;
create policy board_replies_auth_insert on minanowa.board_replies
  for insert
  with check (auth.uid() = author_id);

drop policy if exists board_replies_self_delete on minanowa.board_replies;
create policy board_replies_self_delete on minanowa.board_replies
  for delete
  using (auth.uid() = author_id);

-- ============================================================
-- site_settings
-- ============================================================
alter table minanowa.site_settings enable row level security;

drop policy if exists site_settings_public_read on minanowa.site_settings;
create policy site_settings_public_read on minanowa.site_settings
  for select
  using (true);

drop policy if exists site_settings_admin_write on minanowa.site_settings;
create policy site_settings_admin_write on minanowa.site_settings
  for all
  using (
    exists (
      select 1 from minanowa.members m
      where m.id = auth.uid() and m.is_admin = true
    )
  );

-- ============================================================
-- operating_members
-- ============================================================
alter table minanowa.operating_members enable row level security;

drop policy if exists op_members_public_read on minanowa.operating_members;
create policy op_members_public_read on minanowa.operating_members
  for select
  using (true);

drop policy if exists op_members_admin_write on minanowa.operating_members;
create policy op_members_admin_write on minanowa.operating_members
  for all
  using (
    exists (
      select 1 from minanowa.members m
      where m.id = auth.uid() and m.is_admin = true
    )
  );
