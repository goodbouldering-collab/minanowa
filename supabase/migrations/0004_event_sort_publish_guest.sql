-- 0004_event_sort_publish_guest.sql
-- events: sort_order (drag-drop) と published (公開/下書き) を追加
-- members: is_guest (ゲストフラグ) を追加

alter table legacy_minanowa.events
  add column if not exists sort_order integer not null default 0,
  add column if not exists published boolean not null default true;

alter table legacy_minanowa.members
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_guest boolean not null default false;

create index if not exists events_sort_order_idx on legacy_minanowa.events (sort_order);
create index if not exists members_sort_order_idx on legacy_minanowa.members (sort_order);
create index if not exists members_is_guest_idx on legacy_minanowa.members (is_guest);
