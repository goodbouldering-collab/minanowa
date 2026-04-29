#!/usr/bin/env node
// /uploads/* に参照のあるファイルを本番Renderから取得し、Supabase Storage の media/legacy_minanowa/ に上げる
// data.json 内の /uploads/xxx 参照を https://<supabase>/storage/v1/object/public/media/legacy_minanowa/xxx に書き換え
// その上で Supabase の各テーブルに反映 (members.avatar / events.image / blogs.image など)
//
// 使い方:
//   node scripts/migrate-uploads-to-storage.js [--dry]
//
// 必要 env:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   PROD_URL (default: https://minanowa.onrender.com)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROD_URL = process.env.PROD_URL || 'https://minanowa.onrender.com';
const SCHEMA = process.env.SUPABASE_SCHEMA || 'legacy_minanowa';
const BUCKET = 'media';
const PREFIX = 'legacy_minanowa';
const DRY = process.argv.includes('--dry');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  db: { schema: SCHEMA },
  auth: { persistSession: false },
});
const storage = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } }).storage;

const DATA_FILE = path.join(__dirname, '..', 'data.json');

function publicUrl(filename) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/${filename}`;
}

function collectUploadPaths(data) {
  const set = new Set();
  const walk = (o) => {
    if (typeof o === 'string') {
      const matches = o.match(/\/uploads\/[A-Za-z0-9._-]+/g);
      if (matches) matches.forEach((m) => set.add(m));
    } else if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') Object.values(o).forEach(walk);
  };
  walk(data);
  return Array.from(set);
}

async function fetchFromProd(uploadPath) {
  const url = `${PROD_URL}${uploadPath}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get('content-type') || 'image/jpeg';
  return { buf, contentType: ct };
}

async function uploadToStorage(filename, buf, contentType) {
  const key = `${PREFIX}/${filename}`;
  const { error } = await storage.from(BUCKET).upload(key, buf, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return publicUrl(filename);
}

function rewriteData(data, mapping) {
  const replace = (s) => {
    if (typeof s !== 'string') return s;
    let result = s;
    for (const [from, to] of Object.entries(mapping)) {
      result = result.split(from).join(to);
    }
    return result;
  };
  const walk = (o) => {
    if (typeof o === 'string') return replace(o);
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(o)) out[k] = walk(v);
      return out;
    }
    return o;
  };
  return walk(data);
}

async function main() {
  console.log(`Mode: ${DRY ? 'DRY-RUN' : 'WRITE'}`);
  console.log(`Source: ${PROD_URL}`);
  console.log(`Target: ${SUPABASE_URL} bucket=${BUCKET} prefix=${PREFIX}`);

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const paths = collectUploadPaths(data);
  console.log(`\nFound ${paths.length} /uploads/ paths in data.json`);

  const mapping = {};
  let okCount = 0;
  let failCount = 0;

  for (const p of paths) {
    const filename = p.replace('/uploads/', '');
    const localPath = path.join(__dirname, '..', 'uploads', filename);
    const newUrl = publicUrl(filename);
    mapping[p] = newUrl;

    if (DRY) {
      console.log(`  [DRY] ${p} -> ${newUrl}`);
      continue;
    }

    try {
      let buf, contentType;
      if (fs.existsSync(localPath)) {
        buf = fs.readFileSync(localPath);
        contentType = filename.endsWith('.png')
          ? 'image/png'
          : filename.endsWith('.webp')
          ? 'image/webp'
          : filename.endsWith('.gif')
          ? 'image/gif'
          : 'image/jpeg';
        console.log(`  ✓ ${filename} (local ${(buf.length / 1024).toFixed(1)}KB)`);
      } else {
        const fetched = await fetchFromProd(p);
        buf = fetched.buf;
        contentType = fetched.contentType;
        console.log(`  ↓ ${filename} (prod ${(buf.length / 1024).toFixed(1)}KB)`);
      }
      await uploadToStorage(filename, buf, contentType);
      okCount++;
    } catch (e) {
      console.error(`  ✗ ${filename}: ${e.message}`);
      failCount++;
    }
  }

  console.log(`\nUpload: ${okCount} ok, ${failCount} fail`);

  if (DRY) {
    console.log('\nDry-run mode. Nothing changed.');
    return;
  }

  // data.json を書き換えて Supabase の各テーブルに反映
  const rewritten = rewriteData(data, mapping);
  fs.writeFileSync(DATA_FILE + '.bak', JSON.stringify(data, null, 2));
  fs.writeFileSync(DATA_FILE, JSON.stringify(rewritten, null, 2));
  console.log(`\nWrote ${DATA_FILE} (backup: ${DATA_FILE}.bak)`);

  // Supabase テーブル更新
  console.log('\n=== Supabase テーブルの URL 書き換え ===');

  // members.avatar
  const { data: members } = await sb.from('members').select('id, avatar');
  let mUpdated = 0;
  for (const m of members || []) {
    if (m.avatar && m.avatar.includes('/uploads/')) {
      const newAvatar = mapping[m.avatar] || m.avatar;
      if (newAvatar !== m.avatar) {
        await sb.from('members').update({ avatar: newAvatar }).eq('id', m.id);
        mUpdated++;
      }
    }
  }
  console.log(`members: ${mUpdated} rows updated`);

  // events.image (もしカラムあれば)
  try {
    const { data: events } = await sb.from('events').select('*');
    let eUpdated = 0;
    for (const ev of events || []) {
      const updates = {};
      for (const [k, v] of Object.entries(ev)) {
        if (typeof v === 'string' && v.includes('/uploads/')) {
          const nv = mapping[v];
          if (nv) updates[k] = nv;
        }
      }
      if (Object.keys(updates).length) {
        await sb.from('events').update(updates).eq('id', ev.id);
        eUpdated++;
      }
    }
    console.log(`events: ${eUpdated} rows updated`);
  } catch (e) {
    console.warn(`events: skipped (${e.message})`);
  }

  // blogs.image, blogs.thumbnail 等
  try {
    const { data: blogs } = await sb.from('blogs').select('*');
    let bUpdated = 0;
    for (const b of blogs || []) {
      const updates = {};
      for (const [k, v] of Object.entries(b)) {
        if (typeof v === 'string' && v.includes('/uploads/')) {
          const nv = mapping[v];
          if (nv) updates[k] = nv;
        }
      }
      if (Object.keys(updates).length) {
        await sb.from('blogs').update(updates).eq('id', b.id);
        bUpdated++;
      }
    }
    console.log(`blogs: ${bUpdated} rows updated`);
  } catch (e) {
    console.warn(`blogs: skipped (${e.message})`);
  }

  // boards
  try {
    const { data: boards } = await sb.from('boards').select('*');
    let bdUpdated = 0;
    for (const b of boards || []) {
      const updates = {};
      for (const [k, v] of Object.entries(b)) {
        if (typeof v === 'string' && v.includes('/uploads/')) {
          const nv = mapping[v];
          if (nv) updates[k] = nv;
        }
      }
      if (Object.keys(updates).length) {
        await sb.from('boards').update(updates).eq('id', b.id);
        bdUpdated++;
      }
    }
    console.log(`boards: ${bdUpdated} rows updated`);
  } catch (e) {
    console.warn(`boards: skipped (${e.message})`);
  }

  console.log('\n✅ Migration complete.');
  console.log(`Mapping: ${Object.keys(mapping).length} URL replaced`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
