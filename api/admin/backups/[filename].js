// api/admin/backups/[filename].js
// GET    /api/admin/backups/:filename — Supabase Storage から JSON ダウンロード
// DELETE /api/admin/backups/:filename — Supabase Storage から削除
// server.js 1183-1240 行目から移植
'use strict';

const { withCors, withMethods, requireAdmin, ok, fail, handleErr } = require('../../../lib/vercel-utils');
const { readData } = require('../../../lib/data-cache');

const BACKUP_PREFIX = 'legacy_minanowa/backups';
// data- だけでなく auto- / data-pre-restore- も許容しておく（一覧と整合）
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

async function GET(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const fn = req.query && req.query.filename;
    if (!fn || !FILENAME_RE.test(fn)) return fail(res, 400, '不正なファイル名');

    const storage = getStorage();
    const { data: blob, error } = await storage.from('media').download(`${BACKUP_PREFIX}/${fn}`);
    if (error || !blob) return fail(res, 404, 'ファイルが見つかりません');

    const text = await blob.text();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fn}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.end(text);
  } catch (e) {
    return handleErr(res, e, 'ダウンロードエラー');
  }
}

async function DELETE(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const fn = req.query && req.query.filename;
    if (!fn || !FILENAME_RE.test(fn)) return fail(res, 400, '不正なファイル名');

    const storage = getStorage();
    const { error } = await storage.from('media').remove([`${BACKUP_PREFIX}/${fn}`]);
    if (error) {
      console.warn('[admin/backups DELETE] error:', error.message);
      return fail(res, 500, '削除エラー');
    }

    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true });
  } catch (e) {
    return handleErr(res, e, '削除エラー');
  }
}

module.exports = withCors(withMethods({ GET, DELETE }));
module.exports.config = { runtime: 'nodejs' };
