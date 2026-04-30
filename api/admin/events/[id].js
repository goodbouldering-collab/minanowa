// api/admin/events/[id].js
// PUT    /api/admin/events/:id — 管理者によるイベント更新
// DELETE /api/admin/events/:id — 管理者によるイベント削除
// server.js 877-894 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr, requireAdmin } = require('../../../lib/vercel-utils');
const { readData, writeData } = require('../../../lib/data-cache');

async function PUT(req, res) {
  try {
    const id = req.query.id;
    const body = await readJson(req);
    const data = await readData();
    await requireAdmin(req, data);

    const idx = (data.events || []).findIndex((e) => e.id === id);
    if (idx === -1) return fail(res, 404, 'not found');
    data.events[idx] = { ...data.events[idx], ...body, id: data.events[idx].id };

    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, event: data.events[idx] });
  } catch (e) {
    return handleErr(res, e);
  }
}

async function DELETE(req, res) {
  try {
    const id = req.query.id;
    const data = await readData();
    await requireAdmin(req, data);

    data.events = (data.events || []).filter((e) => e.id !== id);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ PUT, DELETE }));
module.exports.config = { runtime: 'nodejs' };
