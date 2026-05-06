// api/admin/reorder.js
// POST /api/admin/reorder — 一覧の並び順 (sort_order) をまとめて更新
// 入力: { table: 'events'|'members', ids: [id1, id2, ...] }
// 動作: ids[i] のレコードに sort_order = i を付与
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData, writeData } = require('../../lib/data-cache');

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const table = (body.table || '').trim();
    const ids = Array.isArray(body.ids) ? body.ids : null;
    if (!table || !ids) return fail(res, 400, 'table と ids 配列が必要です');
    const allowed = { events: 'events', members: 'members', blogs: 'blogs' };
    const key = allowed[table];
    if (!key) return fail(res, 400, '対象 table が不正です');

    const data = await readData();
    const arr = data[key] || [];
    const indexMap = new Map(ids.map((id, i) => [id, i]));
    arr.forEach(item => {
      if (indexMap.has(item.id)) item.sortOrder = indexMap.get(item.id);
    });
    await writeData(data);

    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, count: ids.length });
  } catch (e) {
    return handleErr(res, e, '並び替え保存に失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
