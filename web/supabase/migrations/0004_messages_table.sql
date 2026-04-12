-- ============================================================
-- messages: お問い合わせフォーム送信
-- ============================================================
create table if not exists minanowa.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_created_idx
  on minanowa.messages (created_at desc);

grant all on table minanowa.messages to anon, authenticated, service_role;

-- RLS: anon は insert のみ可 (お問い合わせ送信), admin のみ読める
alter table minanowa.messages enable row level security;

drop policy if exists "anyone can insert message" on minanowa.messages;
create policy "anyone can insert message" on minanowa.messages
  for insert to anon, authenticated
  with check (true);

drop policy if exists "admin can read messages" on minanowa.messages;
create policy "admin can read messages" on minanowa.messages
  for select to authenticated
  using (
    exists (
      select 1 from minanowa.members
      where members.id = auth.uid() and members.is_admin = true
    )
  );

drop policy if exists "admin can update messages" on minanowa.messages;
create policy "admin can update messages" on minanowa.messages
  for update to authenticated
  using (
    exists (
      select 1 from minanowa.members
      where members.id = auth.uid() and members.is_admin = true
    )
  );

drop policy if exists "admin can delete messages" on minanowa.messages;
create policy "admin can delete messages" on minanowa.messages
  for delete to authenticated
  using (
    exists (
      select 1 from minanowa.members
      where members.id = auth.uid() and members.is_admin = true
    )
  );
