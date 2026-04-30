// api/admin/backups/index.js
// GET /api/admin/backups — Supabase Storage 上のバックアップ JSON 一覧
// server.js 1155-1180 行目から移植
'use strict';

const { withCors, withMethods, requireAdmin, ok, handleErr } = require('../../../lib/vercel-utils');
const { readData } = require('../../../lib/data-cache');

const BACKUP_PREFIX = 'legacy_minanowa/backups';

async function GET(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return ok(res, { backups: [] });
    }

    const { createClient } = require('@supabase/supabase-js');
    const sbStorage = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } }).storage;

    const { data: list, error } = await sbStorage
      .from('media')
      .list(BACKUP_PREFIX, { limit: 500, sortBy: { column: 'updated_at', order: 'desc' } });
    if (error) {
      console.warn('[admin/backups] list error:', error.message);
      return ok(res, { backups: [] });
    }

    const jsonFiles = (list || []).filter(
      (f) => f && f.name && /\.json$/.test(f.name) && (f.name.startsWith('data-') || f.name.startsWith('auto-'))
    );

    // preview のためにファイル本体をダウンロードして件数を読む（数件なら問題ない想定）
    const backups = [];
    for (const f of jsonFiles) {
      let preview = {};
      try {
        const { data: blob } = await sbStorage.from('media').download(`${BACKUP_PREFIX}/${f.name}`);
        if (blob) {
          const text = await blob.text();
          const raw = JSON.parse(text);
          preview = {
            members: (raw.members || []).length,
            events: (raw.events || []).length,
            boards: (raw.boards || []).length,
            blogs: (raw.blogs || []).length,
            interviews: (raw.interviews || []).length,
          };
        }
      } catch { /* preview 失敗は無視 */ }

      backups.push({
        filename: f.name,
        size: (f.metadata && f.metadata.size) || 0,
        date: f.updated_at || f.created_at || null,
        preview,
      });
    }

    backups.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { backups });
  } catch (e) {
    return handleErr(res, e, 'バックアップ一覧取得エラー');
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
