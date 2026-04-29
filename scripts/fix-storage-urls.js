#!/usr/bin/env node
// Supabase legacy_minanowa の各テーブルで /uploads/xxx を Storage URL に書き換える
// (migrate-uploads-to-storage.js でアップロードまで完了済みの前提)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHEMA = 'legacy_minanowa';
const BUCKET = 'media';
const PREFIX = 'legacy_minanowa';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env required');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  db: { schema: SCHEMA },
  auth: { persistSession: false },
});

function toStorageUrl(uploadPath) {
  if (typeof uploadPath !== 'string') return uploadPath;
  if (!uploadPath.includes('/uploads/')) return uploadPath;
  const filename = uploadPath.replace(/^.*\/uploads\//, '');
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/${filename}`;
}

function rewriteValue(v) {
  if (typeof v === 'string' && v.includes('/uploads/')) return toStorageUrl(v);
  if (Array.isArray(v)) return v.map(rewriteValue);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = rewriteValue(val);
    return out;
  }
  return v;
}

async function fixTable(tableName, idColumn = 'id') {
  console.log(`\n--- ${tableName} ---`);
  const { data: rows, error } = await sb.from(tableName).select('*');
  if (error) { console.error(`  fetch error: ${error.message}`); return; }
  console.log(`  fetched ${rows.length} rows`);

  let changed = 0, failed = 0;
  for (const row of rows) {
    const newRow = rewriteValue(row);
    if (JSON.stringify(row) === JSON.stringify(newRow)) continue;
    const id = row[idColumn];
    if (id == null) { console.warn(`  skip row without ${idColumn}`); continue; }

    const updates = {};
    for (const [k, v] of Object.entries(newRow)) {
      if (JSON.stringify(v) !== JSON.stringify(row[k])) updates[k] = v;
    }

    const { error: e2 } = await sb.from(tableName).update(updates).eq(idColumn, id);
    if (e2) { console.error(`  X ${id}: ${e2.message}`); failed++; }
    else { console.log(`  OK ${id} (${Object.keys(updates).join(',')})`); changed++; }
  }
  console.log(`  ${changed} updated, ${failed} failed`);
}

async function fixSiteSettings() {
  console.log(`\n--- site_settings ---`);
  const { data: rows, error } = await sb.from('site_settings').select('*');
  if (error) { console.error(`  fetch error: ${error.message}`); return; }
  console.log(`  fetched ${rows.length} rows`);
  let changed = 0;
  for (const row of rows) {
    const newRow = rewriteValue(row);
    if (JSON.stringify(row) === JSON.stringify(newRow)) continue;
    const idCol = row.id !== undefined ? 'id' : row.key !== undefined ? 'key' : null;
    if (!idCol) { console.warn('  cannot determine primary key, skip'); continue; }
    const updates = {};
    for (const [k, v] of Object.entries(newRow)) {
      if (JSON.stringify(v) !== JSON.stringify(row[k])) updates[k] = v;
    }
    const { error: e2 } = await sb.from('site_settings').update(updates).eq(idCol, row[idCol]);
    if (e2) console.error(`  X ${row[idCol]}: ${e2.message}`);
    else { console.log(`  OK ${row[idCol]}`); changed++; }
  }
  console.log(`  ${changed} updated`);
}

async function main() {
  console.log(`Target: ${SUPABASE_URL} / schema=${SCHEMA}`);
  await fixTable('members');
  await fixTable('events');
  await fixTable('blogs');
  await fixTable('boards');
  await fixSiteSettings();

  console.log('\n=== verify ===');
  for (const t of ['members', 'events', 'blogs', 'boards']) {
    const { data: full } = await sb.from(t).select('*');
    const matches = (full || []).filter((r) =>
      Object.values(r).some((v) => typeof v === 'string' && v.includes('/uploads/'))
    );
    console.log(`  ${t}: ${matches.length} rows still contain /uploads/`);
    for (const m of matches.slice(0, 3)) console.log(`    - ${m.id}`);
  }
  console.log('\ndone');
}

main().catch((e) => { console.error(e); process.exit(1); });