-- Add YouTube video fields to blogs for 活動ムービー category
-- Original legacy schema missed these, causing /api/interviews to return empty.

set search_path = legacy_minanowa, public;

alter table legacy_minanowa.blogs
  add column if not exists youtube_id text,
  add column if not exists youtube_url text;
