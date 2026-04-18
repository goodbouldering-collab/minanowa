-- Add missing legacy fields that were lost during Supabase migration
-- - events.referrals: JSONB used by referral-discount flow in /api/events/:id/register
-- - blogs.sort_order: numeric sort used for hero video ordering
set search_path = legacy_minanowa, public;

alter table legacy_minanowa.events
  add column if not exists referrals jsonb default '{}'::jsonb;

alter table legacy_minanowa.blogs
  add column if not exists sort_order integer default 0;
