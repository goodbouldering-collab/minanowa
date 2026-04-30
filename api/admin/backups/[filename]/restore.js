// api/admin/backups/[filename]/restore.js
// POST /api/admin/backups/:filename/restore — 指定バックアップから復元
//   - 復元前に現在のデータを safety バックアップとして Supabase Storage に保存
//   - その後 writeData() で全データ上書き
// server.js 1197-1228 行目から移植
'use strict';

const { withCors, withMethods, requireAdmin, ok, fail, handleErr } = require('../../../../lib/vercel-utils');
const { readData, writeData } = require('../../../../lib/data-cache');

const BACKUP_PREFIX = 'legacy_minanowa/backups';
const FILENAME_RE = /^(data-|auto-)[\w\-:.]+\.json$/;

function getStorage() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    const err = new Error('Supabase Storage が設定されていません');
    err.status = 500;
    throw err;
  }
  const { createClient } = require('@supabase/supabase-js');
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } }).storage;
}

async function POST(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const fn = req.query && req.query.filename;
    if (!fn || !FILENAME_RE.test(fn)) return fail(res, 400, '不正なファイル名');

    const storage = getStorage();

    // 復元対象 fetch
    const { data: blob, error } = await storage.from('media').download(`${BACKUP_PREFIX}/${fn}`);
    if (error || !blob) return fail(res, 404, 'ファイルが見つかりません');

    let backupData;
    try {
      const text = await blob.text();
      backupData = JSON.parse(text);
    } catch (e) {
      return fail(res, 400, 'バックアップデータの形式が不正です (JSONパース失敗)');
    }
    if (!backupData || typeof backupData !== 'object') {
      return fail(res, 400, 'バックアップデータの形式が不正です');
    }

    // safety backup
    const safetyFn = `data-pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const safetyBuf = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
    const { error: safetyErr } = await storage.from('media').upload(`${BACKUP_PREFIX}/${safetyFn}`, safetyBuf, {
      contentType: 'application/json',
      upsert: false,
    });
    if (safetyErr) {
      console.warn('[restore] safety backup failed:', safetyErr.message);
      // 続行はする（既存挙動は throw しない）
    }

    // restore
    await writeData(backupData);

    const preview = {
      members: (backupData.members || []).length,
      events: (backupData.events || []).length,
      boards: (backupData.boards || []).length,
      blogs: (backupData.blogs || []).length,
      interviews: (backupData.interviews || []).length,
    };
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, safetyBackup: safetyFn, restored: fn, preview });
  } catch (e) {
    console.error('[restore] error:', e && e.message);
    return handleErr(res, e, 'リストアに失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
