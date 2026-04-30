// api/admin/backups/upload.js
// POST /api/admin/backups/upload — multipart アップロードされた JSON ファイルから復元
//   - 復元前に現在のデータを safety backup として Supabase Storage に保存
//   - その後 writeData() で全データ上書き
// server.js 1244-1272 行目から移植
'use strict';

const { withCors, withMethods, readMultipart, requireAdmin, ok, fail, handleErr } = require('../../../lib/vercel-utils');
const { readData, writeData } = require('../../../lib/data-cache');

const BACKUP_PREFIX = 'legacy_minanowa/backups';

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
    // 認証は body parse 前に通したいが、multipart をまだ読んでいないので req.body は無い。
    // requireAdmin は data + ヘッダだけ見るのでこの順で OK。
    const data = await readData();
    await requireAdmin(req, data);

    const { files } = await readMultipart(req, { limits: { fileSize: 50 * 1024 * 1024, files: 1 } });
    const file = (files || []).find((f) => f.field === 'backup') || (files || [])[0];
    if (!file || !file.buffer || file.buffer.length === 0) {
      return fail(res, 400, 'ファイルが選択されていません');
    }
    if (file.truncated) {
      return fail(res, 413, 'ファイルサイズが上限 (50MB) を超えています');
    }

    let backupData;
    try {
      backupData = JSON.parse(file.buffer.toString('utf8'));
    } catch {
      return fail(res, 400, 'JSONの形式が不正です');
    }
    if (!backupData || typeof backupData !== 'object') {
      return fail(res, 400, 'JSONの形式が不正です');
    }

    // safety backup of current data
    const storage = getStorage();
    const safetyFn = `data-pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const safetyBuf = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
    const { error: safetyErr } = await storage.from('media').upload(`${BACKUP_PREFIX}/${safetyFn}`, safetyBuf, {
      contentType: 'application/json',
      upsert: false,
    });
    if (safetyErr) {
      console.warn('[backups/upload] safety backup failed:', safetyErr.message);
    }

    await writeData(backupData);

    const preview = {
      members: (backupData.members || []).length,
      events: (backupData.events || []).length,
      boards: (backupData.boards || []).length,
      blogs: (backupData.blogs || []).length,
      interviews: (backupData.interviews || []).length,
    };
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, safetyBackup: safetyFn, preview });
  } catch (e) {
    console.error('[backups/upload] error:', e && e.message);
    return handleErr(res, e, 'アップロードリストアに失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs', api: { bodyParser: false } };
