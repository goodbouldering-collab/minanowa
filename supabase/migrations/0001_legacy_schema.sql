-- みんなのWA 旧版 (legacy) 用スキーマ
-- 既存 Supabase プロジェクトへの相乗りのため、専用スキーマ legacy_minanowa を使用
-- Next.js 新版の minanowa スキーマとは分離されている
-- 既存の文字列ID (member-xxx, event-xxx) をそのまま維持するため PK は text 型

create schema if not exists legacy_minanowa;

-- ============================================================
-- members
-- ============================================================
create table if not exists legacy_minanowa.members (
  id text primary key,
  email text,
  name text not null,
  furigana text,
  phone text,
  password_hash text,
  google_sub text,
  business text,
  business_category text,
  profession text,
  introduction text,
  member_benefit text,
  avatar text,
  location text,
  website text,
  instagram text,
  homepage text,
  google_map_url text,
  role text,
  map_lat double precision,
  map_lng double precision,
  sns jsonb,
  skills jsonb,
  join_date text,
  is_public boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_is_public_idx on legacy_minanowa.members (is_public);
create index if not exists members_email_idx on legacy_minanowa.members (email);
create index if not exists members_google_sub_idx on legacy_minanowa.members (google_sub);

-- ============================================================
-- events
-- ============================================================
create table if not exists legacy_minanowa.events (
  id text primary key,
  title text not null,
  date text not null,
  time text,
  location text,
  description text,
  detailed_info text,
  participants integer,
  fee text,
  image_url text,
  is_past boolean not null default false,
  application_url text,
  registrations jsonb default '[]'::jsonb,
  reg_details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_date_idx on legacy_minanowa.events (date desc);
create index if not exists events_is_past_idx on legacy_minanowa.events (is_past);

-- ============================================================
-- blogs
-- ============================================================
create table if not exists legacy_minanowa.blogs (
  id text primary key,
  title text not null,
  date text not null,
  category text,
  excerpt text,
  content text,
  author text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blogs_date_idx on legacy_minanowa.blogs (date desc);

-- ============================================================
-- boards
-- ============================================================
create table if not exists legacy_minanowa.boards (
  id text primary key,
  author_id text,
  author_name text not null,
  author_avatar text,
  title text not null,
  content text not null,
  category text,
  mention_to_id text,
  mention_to_name text,
  replies jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boards_created_at_idx on legacy_minanowa.boards (created_at desc);
create index if not exists boards_author_id_idx on legacy_minanowa.boards (author_id);

-- ============================================================
-- messages (お問い合わせ)
-- ============================================================
create table if not exists legacy_minanowa.messages (
  id text primary key,
  name text,
  email text,
  phone text,
  subject text,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_is_read_idx on legacy_minanowa.messages (is_read);
create index if not exists messages_created_at_idx on legacy_minanowa.messages (created_at desc);

-- ============================================================
-- site_settings (シングルトン)
-- ============================================================
create table if not exists legacy_minanowa.site_settings (
  id integer primary key default 1,
  hero_title text,
  hero_subtitle text,
  about_title text,
  about_text text,
  instagram_account text,
  stripe_publishable_key text,
  stripe_secret_key text,
  google_client_id text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

-- ============================================================
-- operating_members (運営メンバー並び)
-- ============================================================
create table if not exists legacy_minanowa.operating_members (
  member_id text primary key,
  sort_order integer not null default 0
);

create index if not exists operating_members_sort_idx
  on legacy_minanowa.operating_members (sort_order);

-- ============================================================
-- password_resets
-- ============================================================
create table if not exists legacy_minanowa.password_resets (
  token text primary key,
  member_id text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_member_idx on legacy_minanowa.password_resets (member_id);

-- ============================================================
-- updated_at 自動更新トリガ
-- ============================================================
create or replace function legacy_minanowa.set_updated_at()
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
  for t in select unnest(array['members','events','blogs','boards','site_settings'])
  loop
    execute format(
      'drop trigger if exists set_updated_at on legacy_minanowa.%I;
       create trigger set_updated_at before update on legacy_minanowa.%I
       for each row execute function legacy_minanowa.set_updated_at();',
      t, t
    );
  end loop;
end$$;

-- ============================================================
-- REST API 公開 (service_role のみ使用するため RLS は off で運用)
-- ============================================================
grant usage on schema legacy_minanowa to anon, authenticated, service_role;
grant all on all tables in schema legacy_minanowa to service_role;
grant all on all sequences in schema legacy_minanowa to service_role;
grant all on all functions in schema legacy_minanowa to service_role;
alter default privileges in schema legacy_minanowa
  grant all on tables to service_role;
alter default privileges in schema legacy_minanowa
  grant all on sequences to service_role;
