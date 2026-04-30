// api/admin/members/[id].js
// PUT    /api/admin/members/:id  — 管理者によるメンバー強制更新
// DELETE /api/admin/members/:id  — 管理者によるメンバー削除
// server.js 942-960 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr, requireAdmin } = require('../../../lib/vercel-utils');
const { readData, writeData } = require('../../../lib/data-cache');

async function PUT(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const id = req.query.id;
    const body = await readJson(req);
    const idx = data.members.findIndex((m) => m.id === id);
    if (idx === -1) return fail(res, 404, 'not found');

    data.members[idx] = { ...data.members[idx], ...body, id: data.members[idx].id };
    await writeData(data);

    const { password, ...safe } = data.members[idx];
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, member: safe });
  } catch (e) {
    return handleErr(res, e);
  }
}

async function DELETE(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const id = req.query.id;
    data.members = data.members.filter((m) => m.id !== id);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ PUT, DELETE }));
module.exports.config = { runtime: 'nodejs' };
