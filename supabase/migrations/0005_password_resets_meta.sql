-- 0005_password_resets_meta.sql
-- password_resets に used_at と kind 列を追加 (db-tokens.js が書き込む追加メタ)

alter table legacy_minanowa.password_resets
  add column if not exists used_at timestamptz,
  add column if not exists kind text;

create index if not exists password_resets_kind_idx on legacy_minanowa.password_resets (kind);
create index if not exists password_resets_expires_idx on legacy_minanowa.password_resets (expires_at);
