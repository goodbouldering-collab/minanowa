-- みんなのWA 初期スキーマ
-- 既存 Supabase プロジェクトへの相乗りのため、専用スキーマ minanowa を使用
-- RLS は別マイグレーション (0002_rls_policies.sql) で設定

create extension if not exists "uuid-ossp";

-- スキーマ作成
create schema if not exists minanowa;

-- ============================================================
-- members
-- ============================================================
create table if not exists minanowa.members (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  furigana text,
  phone text,
  business text,
  business_category text,
  introduction text,
  avatar_url text,
  location text,
  website text,
  instagram text,
  sns jsonb,
  skills text[],
  join_date date,
  is_public boolean not null default true,
  is_admin boolean not null default false,
  profession text,
  homepage text,
  google_map_url text,
  role text,
  map_lat double precision,
  map_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_is_public_idx on minanowa.members (is_public);
create index if not exists members_role_idx on minanowa.members (role);

-- ============================================================
-- events
-- ============================================================
create table if not exists minanowa.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  date date not null,
  time text,
  location text,
  description text,
  detailed_info text,
  participants integer,
  fee text,
  image_url text,
  is_past boolean not null default false,
  application_url text,
  reg_details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_date_idx on minanowa.events (date desc);
create index if not exists events_is_past_idx on minanowa.events (is_past);

-- ============================================================
-- event_registrations
-- ============================================================
create table if not exists minanowa.event_registrations (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references minanowa.events(id) on delete cascade,
  member_id uuid references minanowa.members(id) on delete set null,
  guest_name text,
  guest_email text,
  status text not null default 'registered',
  created_at timestamptz not null default now()
);

create index if not exists event_registrations_event_id_idx
  on minanowa.event_registrations (event_id);
create index if not exists event_registrations_member_id_idx
  on minanowa.event_registrations (member_id);

-- ============================================================
-- blogs
-- ============================================================
create table if not exists minanowa.blogs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  date date not null,
  category text,
  excerpt text,
  content text,
  author text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blogs_date_idx on minanowa.blogs (date desc);
create index if not exists blogs_category_idx on minanowa.blogs (category);

-- ============================================================
-- boards
-- ============================================================
create table if not exists minanowa.boards (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references minanowa.members(id) on delete set null,
  author_name text not null,
  author_avatar text,
  title text not null,
  content text not null,
  category text,
  mention_to_id uuid references minanowa.members(id) on delete set null,
  mention_to_name text,
  created_at timestamptz not null default now()
);

create index if not exists boards_created_at_idx on minanowa.boards (created_at desc);
create index if not exists boards_author_id_idx on minanowa.boards (author_id);

-- ============================================================
-- board_replies
-- ============================================================
create table if not exists minanowa.board_replies (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid not null references minanowa.boards(id) on delete cascade,
  author_id uuid references minanowa.members(id) on delete set null,
  author_name text not null,
  author_avatar text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists board_replies_board_id_idx
  on minanowa.board_replies (board_id);

-- ============================================================
-- site_settings
-- ============================================================
create table if not exists minanowa.site_settings (
  id integer primary key default 1,
  hero_title text,
  hero_subtitle text,
  about_title text,
  about_text text,
  instagram_account text,
  stripe_publishable_key text,
  google_client_id text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

-- ============================================================
-- operating_members
-- ============================================================
create table if not exists minanowa.operating_members (
  member_id uuid primary key references minanowa.members(id) on delete cascade,
  sort_order integer not null default 0
);

create index if not exists operating_members_sort_idx
  on minanowa.operating_members (sort_order);

-- ============================================================
-- updated_at 自動更新トリガ
-- ============================================================
create or replace function minanowa.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in select unnest(array['members','events','blogs','site_settings'])
  loop
    execute format(
      'drop trigger if exists set_updated_at on minanowa.%I;
       create trigger set_updated_at before update on minanowa.%I
       for each row execute function minanowa.set_updated_at();',
      t, t
    );
  end loop;
end$$;

-- ============================================================
-- Supabase REST API から minanowa スキーマにアクセスできるように公開
-- ============================================================
grant usage on schema minanowa to anon, authenticated, service_role;
grant all on all tables in schema minanowa to anon, authenticated, service_role;
grant all on all sequences in schema minanowa to anon, authenticated, service_role;
grant all on all functions in schema minanowa to anon, authenticated, service_role;
alter default privileges in schema minanowa
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema minanowa
  grant all on sequences to anon, authenticated, service_role;
