// api/admin/backup.js
// GET /api/admin/backup — 現在の data を Supabase Storage に snapshot として保存し、ダウンロードもさせる
// server.js 1147-1152 行目から移植
//
// Vercel ではローカルディスク (PERSISTENT_DIR) が使えないため
// Supabase Storage `media/legacy_minanowa/backups/` をバックアップ置き場として利用する。
'use strict';

const { withCors, withMethods, requireAdmin, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData } = require('../../lib/data-cache');

const BACKUP_PREFIX = 'legacy_minanowa/backups/';

function makeFilename(prefix = 'data-') {
  return `${prefix}${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

async function uploadBackup(filename, data) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    const err = new Error('Supabase Storage が設定されていません');
    err.status = 500;
    throw err;
  }
  const { createClient } = require('@supabase/supabase-js');
  const sbStorage = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } }).storage;
  const key = `${BACKUP_PREFIX}${filename}`;
  const buf = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
  const { error } = await sbStorage.from('media').upload(key, buf, {
    contentType: 'application/json',
    upsert: false,
  });
  if (error) throw error;
  return { key, filename };
}

async function GET(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const fn = makeFilename('data-');
    await uploadBackup(fn, data);

    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, filename: fn });
  } catch (e) {
    if (e && e.status === 401) return fail(res, 401, e.message);
    if (e && e.status === 403) return fail(res, 403, e.message);
    return handleErr(res, e, 'バックアップ作成に失敗しました');
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
