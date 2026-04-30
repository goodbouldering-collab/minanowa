// api/upload.js
// POST /api/upload — 画像 multipart アップロード → Supabase Storage 直送
// server.js 542-572 行目から移植 (Vercel では /uploads ローカルディスクは使えないため Supabase 直送のみ)
'use strict';

const path = require('path');
const { withCors, withMethods, readMultipart, ok, fail, handleErr } = require('../lib/vercel-utils');

async function POST(req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return fail(res, 500, 'Supabase Storage が設定されていません (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
    }

    const { files } = await readMultipart(req, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
    // server.js 互換で field 名は 'image' を最優先、無ければ最初の file
    const file = (files || []).find((f) => f.field === 'image') || (files || [])[0];
    if (!file || !file.buffer || file.buffer.length === 0) {
      return fail(res, 400, 'ファイルなし');
    }
    if (file.truncated) {
      return fail(res, 413, 'ファイルサイズが上限 (10MB) を超えています');
    }

    const { createClient } = require('@supabase/supabase-js');
    const sbStorage = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } }).storage;
    const ext = path.extname(file.filename || '') || '.jpeg';
    const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const key = `legacy_minanowa/${filename}`;

    const { error } = await sbStorage.from('media').upload(key, file.buffer, {
      contentType: file.mimeType || 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;

    const url = `${SUPABASE_URL}/storage/v1/object/public/media/${key}`;
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, url });
  } catch (e) {
    console.error('[upload] error:', e && e.message);
    return handleErr(res, e, 'アップロードに失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs', api: { bodyParser: false } };
